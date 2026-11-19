
const express = require('express');
const pool = require('./db');

const router = express.Router();

// Termin mit Stornocode stornieren
router.post('/', async (req, res) => {
    try {
        const { stornocode } = req.body || {};

        if (
            typeof stornocode !== 'string' ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stornocode)
        ) {
            return res.status(400).json({
                error: 'Ungültiger Stornocode.'
            });
        }

        // Nur rechtzeitig stornierbare Termine ändern
        const [result] = await pool.execute(
            `UPDATE termine
             SET status = 'storniert'
             WHERE stornocode = ?
               AND status = 'gebucht'
               AND beginn >= DATE_ADD(NOW(), INTERVAL 24 HOUR)`,
            [stornocode]
        );

        if (result.affectedRows === 0) {
            return res.status(409).json({
                error: 'Termin nicht gefunden, bereits storniert oder Stornofrist abgelaufen.'
            });
        }

        res.json({
            message: 'Termin erfolgreich storniert!'
        });

    } catch (error) {
        console.error('Stornierungsfehler:', error);

        res.status(500).json({
            error: 'Termin konnte nicht storniert werden.'
        });
    }
});

module.exports = router;
