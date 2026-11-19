
const express = require('express');
const crypto = require('node:crypto');

const pool = require('./db');
const { getTimeSlots } = require('./bookingRules');

const router = express.Router();

function validId(value) {
    return Number.isSafeInteger(Number(value)) &&
        Number(value) > 0 &&
        value !== null &&
        value !== undefined &&
        value !== '';
}

function validDate(value) {
    if (typeof value !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T12:00:00`);

    return !Number.isNaN(date.getTime()) &&
        date.getFullYear() === Number(value.slice(0, 4)) &&
        date.getMonth() + 1 === Number(value.slice(5, 7)) &&
        date.getDate() === Number(value.slice(8, 10));
}

function withinBookingPeriod(start) {
    const now = new Date();

    const earliest = new Date(
        now.getTime() + 2 * 60 * 60 * 1000
    );

    const latest = new Date(now);
    const day = latest.getDate();

    latest.setDate(1);
    latest.setMonth(latest.getMonth() + 3);

    const lastDay = new Date(
        latest.getFullYear(),
        latest.getMonth() + 1,
        0
    ).getDate();

    latest.setDate(Math.min(day, lastDay));

    return start >= earliest && start <= latest;
}

router.post('/', async (req, res) => {
    const {
        name,
        telefon,
        email,
        leistungId,
        mitarbeiterId,
        datum,
        zeit
    } = req.body || {};

    // Eingaben prüfen
    if (
        typeof name !== 'string' ||
        !name.trim() ||
        name.length > 100 ||
        typeof telefon !== 'string' ||
        !/^[+0-9 ()/-]{5,30}$/.test(telefon) ||
        typeof email !== 'string' ||
        email.length > 255 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !validId(leistungId) ||
        !validDate(datum) ||
        typeof zeit !== 'string' ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(zeit) ||
        (mitarbeiterId !== 'egal' && !validId(mitarbeiterId))
    ) {
        return res.status(400).json({
            error: 'Bitte gültige Buchungsdaten eingeben.'
        });
    }

    const start = new Date(`${datum}T${zeit}:00`);

    if (!withinBookingPeriod(start)) {
        return res.status(400).json({
            error: 'Buchung nur 2 Stunden bis 3 Monate im Voraus möglich.'
        });
    }

    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Leistung aus Datenbank laden
        const [services] = await connection.execute(
            `SELECT id, name, dauer_minuten, preis
             FROM leistungen
             WHERE id = ? AND aktiv = 1`,
            [Number(leistungId)]
        );

        if (!services.length) {
            await connection.rollback();
            return res.status(404).json({
                error: 'Leistung nicht gefunden.'
            });
        }

        const service = services[0];

        // Öffnungszeiten und 15-Minuten-Raster prüfen
        const slots = getTimeSlots(
            datum,
            service.dauer_minuten
        );

        if (!slots.includes(zeit)) {
            await connection.rollback();
            return res.status(400).json({
                error: 'Termin liegt außerhalb der erlaubten Buchungszeiten.'
            });
        }

        // Geeignete Mitarbeiter laden und sperren
        const params = [Number(leistungId)];

        let sql = `
            SELECT m.id, m.name
            FROM mitarbeiter m
            JOIN mitarbeiter_leistungen ml
                ON ml.mitarbeiter_id = m.id
            WHERE ml.leistung_id = ?
              AND m.aktiv = 1
        `;

        if (mitarbeiterId !== 'egal') {
            sql += ' AND m.id = ?';
            params.push(Number(mitarbeiterId));
        }

        sql += ' ORDER BY m.id FOR UPDATE';

        const [employees] = await connection.execute(
            sql,
            params
        );

        if (!employees.length) {
            await connection.rollback();
            return res.status(404).json({
                error: 'Kein geeigneter Mitarbeiter gefunden.'
            });
        }

        const ende = new Date(
            start.getTime() +
            service.dauer_minuten * 60000
        );

        const formatDateTime = (date) => {
            const pad = (n) => String(n).padStart(2, '0');

            return (
                `${date.getFullYear()}-` +
                `${pad(date.getMonth() + 1)}-` +
                `${pad(date.getDate())} ` +
                `${pad(date.getHours())}:` +
                `${pad(date.getMinutes())}:00`
            );
        };

        const beginnSQL = formatDateTime(start);
        const endeSQL = formatDateTime(ende);

        // Freien Mitarbeiter suchen
        let selectedEmployee = null;

        for (const employee of employees) {
            const [conflicts] = await connection.execute(
                `SELECT id
                 FROM termine
                 WHERE mitarbeiter_id = ?
                   AND status <> 'storniert'
                   AND beginn < ?
                   AND ende > ?
                 LIMIT 1`,
                [employee.id, endeSQL, beginnSQL]
            );

            if (!conflicts.length) {
                selectedEmployee = employee;
                break;
            }
        }

        if (!selectedEmployee) {
            await connection.rollback();
            return res.status(409).json({
                error: 'Dieser Termin ist bereits belegt.'
            });
        }

        // Kunden anhand der E-Mail wiedererkennen
        const [customerResult] = await connection.execute(
            `INSERT INTO kunden (name, telefon, email)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
                 id = LAST_INSERT_ID(id)`,
            [name.trim(), telefon.trim(), email.trim()]
        );

        const kundeId = customerResult.insertId;
        const stornocode = crypto.randomUUID();

        // Buchung speichern
        const [result] = await connection.execute(
            `INSERT INTO termine (
                kunde_id,
                mitarbeiter_id,
                leistung_id,
                beginn,
                ende,
                status,
                stornocode,
                preis_zum_zeitpunkt
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                kundeId,
                selectedEmployee.id,
                service.id,
                beginnSQL,
                endeSQL,
                'gebucht',
                stornocode,
                service.preis
            ]
        );

        await connection.commit();

        res.status(201).json({
            message: 'Termin erfolgreich gebucht!',
            terminId: result.insertId,
            datum,
            zeit,
            mitarbeiter: selectedEmployee.name,
            leistung: service.name,
            stornocode
        });

    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Rollback fehlgeschlagen:', rollbackError);
            }
        }

        console.error('Buchungsfehler:', error);

        res.status(500).json({
            error: 'Buchung konnte nicht gespeichert werden.'
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
});

module.exports = router;
