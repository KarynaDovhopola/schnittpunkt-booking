
const pool = require('./db');
const { getTimeSlots } = require('./bookingRules');

// Uhrzeit in Minuten umrechnen
function zuMinuten(zeit) {
    const [stunden, minuten] = zeit.split(':').map(Number);
    return stunden * 60 + minuten;
}

// Freie Zeiten eines Mitarbeiters berechnen
async function freieZeitenFuerMitarbeiter(
    datum,
    leistungId,
    mitarbeiterId,
    dauer
) {
    const alleZeiten = getTimeSlots(datum, dauer);

    const [termine] = await pool.execute(
        `SELECT
            TIME_FORMAT(beginn, '%H:%i') AS startzeit,
            TIME_FORMAT(ende, '%H:%i') AS endzeit
         FROM termine
         WHERE mitarbeiter_id = ?
           AND beginn < DATE_ADD(?, INTERVAL 1 DAY)
           AND ende > ?
           AND status = ?`,
        [mitarbeiterId, datum, datum, 'gebucht']
    );

    return alleZeiten.filter((zeit) => {
        const start = zuMinuten(zeit);
        const ende = start + dauer;

        return !termine.some((termin) => {
            const belegtVon = zuMinuten(termin.startzeit);
            const belegtBis = zuMinuten(termin.endzeit);

            return start < belegtBis && ende > belegtVon;
        });
    });
}

module.exports = { freieZeitenFuerMitarbeiter };
