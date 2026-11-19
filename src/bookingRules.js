
const OPENING_HOURS = {
    0: null,        // Sonntag
    1: null,        // Montag
    2: [9, 18],     // Dienstag
    3: [9, 18],     // Mittwoch
    4: [9, 18],     // Donnerstag
    5: [9, 18],     // Freitag
    6: [9, 14]      // Samstag
};

function getOpeningHours(date) {
    return OPENING_HOURS[date.getDay()];
}

function formatTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function getTimeSlots(dateString, duration) {
    const date = new Date(`${dateString}T12:00:00`);

    if (Number.isNaN(date.getTime())) {
        return [];
    }

    const hours = getOpeningHours(date);

    if (!hours) {
        return [];
    }

    const [openingHour, closingHour] = hours;

    const start = openingHour * 60;
    const end = closingHour * 60;

    const slots = [];

    for (let time = start; time + duration <= end; time += 15) {
        slots.push(formatTime(time));
    }

    return slots;
}

module.exports = { getTimeSlots };
