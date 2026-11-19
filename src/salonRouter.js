
const express = require('express');
const crypto = require('node:crypto');
const pool = require('./db');

const router = express.Router();

const SESSION_HOURS = 8;
const SESSION_SECONDS = SESSION_HOURS * 60 * 60;

// ========================================
// HILFSFUNKTIONEN
// ========================================

function getSecret() {
    return process.env.SALON_SESSION_SECRET || '';
}

function sign(payload) {
    return crypto
        .createHmac('sha256', getSecret())
        .update(payload)
        .digest('hex');
}

function safeEqual(a, b) {
    const first = Buffer.from(String(a));
    const second = Buffer.from(String(b));

    if (first.length !== second.length) {
        return false;
    }

    return crypto.timingSafeEqual(first, second);
}

function createSession() {
    const expires = Date.now() + SESSION_SECONDS * 1000;
    const nonce = crypto.randomBytes(16).toString('hex');
    const payload = `${expires}.${nonce}`;

    return `${payload}.${sign(payload)}`;
}

function readSession(req) {
    const rawCookies = req.headers.cookie || '';

    const entry = rawCookies
        .split(';')
        .map(item => item.trim())
        .find(item => item.startsWith('salon_session='));

    if (!entry) {
        return false;
    }

    const token = entry.slice('salon_session='.length);
    const parts = token.split('.');

    if (parts.length !== 3) {
        return false;
    }

    const [expires, nonce, signature] = parts;
    const payload = `${expires}.${nonce}`;

    if (!/^\d+$/.test(expires)) {
        return false;
    }

    if (!/^[0-9a-f]{32}$/.test(nonce)) {
        return false;
    }

    if (!/^[0-9a-f]{64}$/.test(signature)) {
        return false;
    }

    if (Date.now() >= Number(expires)) {
        return false;
    }

    if (!getSecret()) {
        return false;
    }

    return safeEqual(signature, sign(payload));
}

function cookieOptions() {
    return {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/'
    };
}

function requireSalon(req, res, next) {
    if (!readSession(req)) {
        return res.status(401).json({
            error: 'Bitte zuerst anmelden.'
        });
    }

    next();
}

function validId(value) {
    return (
        Number.isSafeInteger(Number(value)) &&
        Number(value) > 0 &&
        /^\d+$/.test(String(value))
    );
}

function validDate(value) {
    if (typeof value !== 'string') {
        return false;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T12:00:00`);

    return (
        !Number.isNaN(date.getTime()) &&
        date.getFullYear() === Number(value.slice(0, 4)) &&
        date.getMonth() + 1 === Number(value.slice(5, 7)) &&
        date.getDate() === Number(value.slice(8, 10))
    );
}

// ========================================
// 1. ANMELDUNG
// ========================================

router.post('/login', (req, res) => {
    const password = req.body?.password;
    const expected = process.env.SALON_PASSWORD;

    if (!expected || !getSecret()) {
        return res.status(503).json({
            error: 'Salon-Zugang ist nicht konfiguriert.'
        });
    }

    if (
        typeof password !== 'string' ||
        !safeEqual(password, expected)
    ) {
        return res.status(401).json({
            error: 'Falsches Passwort.'
        });
    }

    res.cookie(
        'salon_session',
        createSession(),
        {
            ...cookieOptions(),
            maxAge: SESSION_SECONDS * 1000
        }
    );

    res.json({
        message: 'Anmeldung erfolgreich.'
    });
});

// ========================================
// 2. ABMELDUNG
// ========================================

router.post('/logout', (req, res) => {
    res.clearCookie('salon_session', cookieOptions());

    res.json({
        message: 'Abgemeldet.'
    });
});

// ========================================
// 3. SESSION PRÜFEN
// ========================================

router.get('/session', requireSalon, (req, res) => {
    res.json({
        angemeldet: true
    });
});

// Alle folgenden Routen sind geschützt
router.use(requireSalon);

// ========================================
// 4. TAGESÜBERSICHT
// ========================================

router.get('/termine', async (req, res) => {
    const { datum } = req.query;

    if (!validDate(datum)) {
        return res.status(400).json({
            error: 'Ungültiges Datum.'
        });
    }

    try {
        const [rows] = await pool.execute(
            `SELECT
                t.id,
                DATE_FORMAT(t.beginn, '%H:%i') AS zeit,
                DATE_FORMAT(t.ende, '%H:%i') AS ende,
                t.status,
                k.name AS kunde,
                k.telefon,
                l.name AS leistung,
                m.id AS mitarbeiter_id,
                m.name AS mitarbeiter
             FROM termine t
             JOIN kunden k ON k.id = t.kunde_id
             JOIN leistungen l ON l.id = t.leistung_id
             JOIN mitarbeiter m ON m.id = t.mitarbeiter_id
             WHERE t.beginn >= ?
               AND t.beginn < DATE_ADD(?, INTERVAL 1 DAY)
             ORDER BY t.beginn, m.id`,
            [`${datum} 00:00:00`, datum]
        );

        res.json(rows);

    } catch (error) {
        console.error('Salon-Termine:', error);

        res.status(500).json({
            error: 'Termine konnten nicht geladen werden.'
        });
    }
});

// ========================================
// 5. TERMINSTATUS ÄNDERN
// ========================================

router.patch('/termine/:id/status', async (req, res) => {
    const id = req.params.id;
    const { status } = req.body || {};

    if (
        !validId(id) ||
        !['erledigt', 'storniert'].includes(status)
    ) {
        return res.status(400).json({
            error: 'Ungültige Eingabe.'
        });
    }

    try {
        const [result] = await pool.execute(
            `UPDATE termine
             SET status = ?
             WHERE id = ?
               AND status = 'gebucht'`,
            [status, Number(id)]
        );

        if (result.affectedRows === 0) {
            return res.status(409).json({
                error: 'Termin nicht gefunden oder bereits abgeschlossen.'
            });
        }

        res.json({
            message: 'Termin aktualisiert.'
        });

    } catch (error) {
        console.error('Terminstatus:', error);

        res.status(500).json({
            error: 'Status konnte nicht geändert werden.'
        });
    }
});

// ========================================
// 6. LEISTUNGEN ANZEIGEN
// ========================================

router.get('/leistungen', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT
                id,
                name,
                dauer_minuten,
                preis,
                aktiv
             FROM leistungen
             ORDER BY id`
        );

        res.json(rows);

    } catch (error) {
        console.error('Salon-Leistungen:', error);

        res.status(500).json({
            error: 'Leistungen konnten nicht geladen werden.'
        });
    }
});

// ========================================
// HILFSFUNKTION: LEISTUNG PRÜFEN
// ========================================

function checkService(body) {
    const name = body?.name;
    const duration = Number(body?.dauer_minuten);
    const price = Number(body?.preis);

    if (
        typeof name !== 'string' ||
        !name.trim() ||
        name.trim().length > 100 ||
        !Number.isInteger(duration) ||
        duration < 1 ||
        duration > 480 ||
        body?.preis === '' ||
        body?.preis == null ||
        !Number.isFinite(price) ||
        price < 0 ||
        price > 999999.99 ||
        !/^\d+(\.\d{1,2})?$/.test(String(body.preis))
    ) {
        return null;
    }

    return {
        name: name.trim(),
        duration,
        price
    };
}

// ========================================
// 7. NEUE LEISTUNG ANLEGEN
// ========================================

router.post('/leistungen', async (req, res) => {
    const data = checkService(req.body);

    if (!data) {
        return res.status(400).json({
            error: 'Name, Dauer oder Preis ungültig.'
        });
    }

    try {
        const [result] = await pool.execute(
            `INSERT INTO leistungen
             (name, dauer_minuten, preis, aktiv)
             VALUES (?, ?, ?, 1)`,
            [
                data.name,
                data.duration,
                data.price
            ]
        );

        res.status(201).json({
            message: 'Leistung angelegt.',
            id: result.insertId
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                error: 'Diese Leistung existiert bereits.'
            });
        }

        console.error('Leistung erstellen:', error);

        res.status(500).json({
            error: 'Leistung konnte nicht angelegt werden.'
        });
    }
});

// ========================================
// 8. LEISTUNG ÄNDERN
// ========================================

router.put('/leistungen/:id', async (req, res) => {
    const data = checkService(req.body);

    if (!validId(req.params.id) || !data) {
        return res.status(400).json({
            error: 'Ungültige Eingabe.'
        });
    }

    try {
        const [result] = await pool.execute(
            `UPDATE leistungen
             SET name = ?, dauer_minuten = ?, preis = ?
             WHERE id = ?`,
            [
                data.name,
                data.duration,
                data.price,
                Number(req.params.id)
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Leistung nicht gefunden.'
            });
        }

        res.json({
            message: 'Leistung aktualisiert.'
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                error: 'Dieser Name ist bereits vergeben.'
            });
        }

        console.error('Leistung ändern:', error);

        res.status(500).json({
            error: 'Leistung konnte nicht geändert werden.'
        });
    }
});

// ========================================
// ROUTER EXPORTIEREN
// ========================================

module.exports = router;
