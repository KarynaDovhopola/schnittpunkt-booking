
require('dotenv').config();

const express = require('express');
const pool = require('./db');
const { freieZeitenFuerMitarbeiter } = require('./availability');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(express.static('public'));


// ========================================
// HILFSFUNKTIONEN
// ========================================

function gueltigeId(wert) {
    if (typeof wert !== 'string' ||
        !/^[1-9]\d*$/.test(wert)) {
        return false;
    }

    return Number.isSafeInteger(Number(wert));
}

function gueltigesDatum(datum) {
    if (
        typeof datum !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(datum)
    ) {
        return false;
    }

    const date = new Date(`${datum}T12:00:00`);

    return (
        !Number.isNaN(date.getTime()) &&
        date.getFullYear() === Number(datum.slice(0, 4)) &&
        date.getMonth() + 1 === Number(datum.slice(5, 7)) &&
        date.getDate() === Number(datum.slice(8, 10))
    );
}

// Buchungsfrist: mindestens 2 Stunden,
// höchstens 3 Kalendermonate
function istBuchbar(datum, zeit) {
    const jetzt = new Date();

    const fruehestens = new Date(
        jetzt.getTime() + 2 * 60 * 60 * 1000
    );

    const spaetestens = new Date(jetzt);
    const tag = spaetestens.getDate();

    spaetestens.setDate(1);
    spaetestens.setMonth(
        spaetestens.getMonth() + 3
    );

    const letzterTag = new Date(
        spaetestens.getFullYear(),
        spaetestens.getMonth() + 1,
        0
    ).getDate();

    spaetestens.setDate(Math.min(tag, letzterTag));

    const terminBeginn = new Date(
        `${datum}T${zeit}:00`
    );

    return (
        terminBeginn >= fruehestens &&
        terminBeginn <= spaetestens
    );
}

// ========================================
// 1. SERVERSTATUS
// ========================================

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Schnittpunkt Server läuft!'
    });
});

// ========================================
// 2. LEISTUNGEN
// ========================================

app.get('/api/leistungen', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT id, name, dauer_minuten, preis
             FROM leistungen
             WHERE aktiv = ?
             ORDER BY id`,
            [1]
        );

        res.json(rows);

    } catch (error) {
        console.error('Datenbankfehler:', error);

        res.status(500).json({
            error: 'Leistungen konnten nicht geladen werden.'
        });
    }
});

// ========================================
// 3. MITARBEITER
// ========================================

app.get('/api/mitarbeiter', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT id, name
             FROM mitarbeiter
             WHERE aktiv = ?
             ORDER BY id`,
            [1]
        );

        res.json(rows);

    } catch (error) {
        console.error('Datenbankfehler:', error);

        res.status(500).json({
            error: 'Mitarbeiter konnten nicht geladen werden.'
        });
    }
});

// ========================================
// 4. MITARBEITER NACH LEISTUNG
// ========================================

app.get('/api/leistungen/:id/mitarbeiter', async (req, res) => {
    try {
        const leistungId = req.params.id;

        if (!gueltigeId(leistungId)) {
            return res.status(400).json({
                error: 'Ungültige Leistungs-ID.'
            });
        }

        const [rows] = await pool.execute(
            `SELECT m.id, m.name
             FROM mitarbeiter m
             JOIN mitarbeiter_leistungen ml
                 ON ml.mitarbeiter_id = m.id
             JOIN leistungen l
                 ON l.id = ml.leistung_id
             WHERE ml.leistung_id = ?
               AND m.aktiv = 1
               AND l.aktiv = 1
             ORDER BY m.id`,
            [Number(leistungId)]
        );

        res.json(rows);

    } catch (error) {
        console.error('Datenbankfehler:', error);

        res.status(500).json({
            error: 'Mitarbeiter konnten nicht geladen werden.'
        });
    }
});

// ========================================
// 5. VERFÜGBARE BUCHUNGSZEITEN
// ========================================

app.get('/api/zeiten', async (req, res) => {
    try {
        const {
            datum,
            leistungId,
            mitarbeiterId
        } = req.query;

        // Eingaben überprüfen
        if (!gueltigesDatum(datum)) {
            return res.status(400).json({
                error: 'Ungültiges Datum. YYYY-MM-DD erwartet.'
            });
        }

        if (!gueltigeId(leistungId)) {
            return res.status(400).json({
                error: 'Ungültige Leistungs-ID.'
            });
        }

        const egal = mitarbeiterId === 'egal';

        if (!egal && !gueltigeId(mitarbeiterId)) {
            return res.status(400).json({
                error: 'Ungültige Mitarbeiter-ID.'
            });
        }

        const id = Number(leistungId);

        // Leistung prüfen
        const [leistungen] = await pool.execute(
            `SELECT id, dauer_minuten
             FROM leistungen
             WHERE id = ? AND aktiv = 1`,
            [id]
        );

        if (leistungen.length === 0) {
            return res.status(404).json({
                error: 'Leistung nicht gefunden.'
            });
        }

        const dauer = leistungen[0].dauer_minuten;

        // Passende Mitarbeiter ermitteln
        let sql = `
            SELECT m.id, m.name
            FROM mitarbeiter m
            JOIN mitarbeiter_leistungen ml
                ON ml.mitarbeiter_id = m.id
            WHERE ml.leistung_id = ?
              AND m.aktiv = 1
        `;

        const parameter = [id];

        if (!egal) {
            sql += ' AND m.id = ?';
            parameter.push(Number(mitarbeiterId));
        }

        sql += ' ORDER BY m.id';

        const [mitarbeiter] = await pool.execute(
            sql,
            parameter
        );

        if (mitarbeiter.length === 0) {
            return res.status(404).json({
                error: 'Kein passender Mitarbeiter gefunden.'
            });
        }

        // Freie Zeiten aller passenden Mitarbeiter sammeln
        const zeitenSet = new Set();

        for (const person of mitarbeiter) {
            const freieZeiten =
                await freieZeitenFuerMitarbeiter(
                    datum,
                    id,
                    person.id,
                    dauer
                );

            for (const zeit of freieZeiten) {
                if (istBuchbar(datum, zeit)) {
                    zeitenSet.add(zeit);
                }
            }
        }

        // Doppelte Uhrzeiten entfernen und sortieren
        const zeiten = [...zeitenSet].sort();

        res.json({
            datum,
            leistungId: id,
            mitarbeiterId: egal
                ? 'egal'
                : Number(mitarbeiterId),
            zeiten
        });

    } catch (error) {
        console.error('Fehler bei Verfügbarkeit:', error);

        res.status(500).json({
            error: 'Freie Zeiten konnten nicht geladen werden.'
        });
    }
});

// ========================================
// 6. SERVER STARTEN
// ========================================

app.use('/api/termine', require('./bookingRouter'));

app.use('/api/stornieren', require('./cancelRouter'));

app.listen(PORT, () => {
    console.log(
        `Server läuft auf http://localhost:${PORT}`
    );
});


