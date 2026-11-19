
const form = document.getElementById('bookingForm');

const leistung = document.getElementById('leistung');
const mitarbeiter = document.getElementById('mitarbeiter');
const datum = document.getElementById('datum');
const zeit = document.getElementById('zeit');
const message = document.getElementById('message');

function showMessage(text, type = '') {
    message.textContent = text;
    message.className = type;
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Ein Fehler ist aufgetreten.');
    }

    return data;
}

function addOption(select, value, label) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
}

function resetTimes() {
    zeit.innerHTML = '';
    addOption(zeit, '', 'Bitte Uhrzeit auswählen');
}

function localDateString(date) {
    const pad = value => String(value).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Leistungen aus Datenbank laden
async function loadServices() {
    try {
        const services = await apiRequest('/api/leistungen');

        leistung.innerHTML = '';
        addOption(leistung, '', 'Bitte Leistung auswählen');

        services.forEach(service => {
            addOption(
                leistung,
                service.id,
                `${service.name} – ${service.dauer_minuten} Min. – ${Number(service.preis).toFixed(2)} €`
            );
        });

    } catch (error) {
        showMessage(error.message, 'error');
    }
}

// Passende Mitarbeiter laden
async function loadEmployees() {
    mitarbeiter.innerHTML = '';
    addOption(mitarbeiter, 'egal', 'Egal – wer frei ist');

    resetTimes();

    if (!leistung.value) {
        return;
    }

    try {
        const employees = await apiRequest(
            `/api/leistungen/${leistung.value}/mitarbeiter`
        );

        employees.forEach(employee => {
            addOption(mitarbeiter, employee.id, employee.name);
        });

    } catch (error) {
        showMessage(error.message, 'error');
    }
}

// Freie Uhrzeiten laden
async function loadTimes() {
    resetTimes();
    showMessage('');

    if (!leistung.value || !datum.value) {
        return;
    }

    const params = new URLSearchParams({
        datum: datum.value,
        leistungId: leistung.value,
        mitarbeiterId: mitarbeiter.value
    });

    try {
        const result = await apiRequest(
            `/api/zeiten?${params.toString()}`
        );

        if (result.zeiten.length === 0) {
            showMessage(
                'Für diese Auswahl sind keine freien Termine verfügbar.',
                'error'
            );
            return;
        }

        result.zeiten.forEach(time => {
            addOption(zeit, time, time);
        });

    } catch (error) {
        showMessage(error.message, 'error');
    }
}

// Termin buchen
form.addEventListener('submit', async event => {
    event.preventDefault();
    showMessage('');

    const booking = {
        name: document.getElementById('name').value.trim(),
        telefon: document.getElementById('telefon').value.trim(),
        email: document.getElementById('email').value.trim(),
        leistungId: Number(leistung.value),
        mitarbeiterId: mitarbeiter.value === 'egal'
            ? 'egal'
            : Number(mitarbeiter.value),
        datum: datum.value,
        zeit: zeit.value
    };

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
        const result = await apiRequest('/api/termine', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(booking)
        });

        showMessage(
            `Termin erfolgreich gebucht! ` +
            `Mitarbeiter: ${result.mitarbeiter}. ` +
            `Datum: ${result.datum}, Uhrzeit: ${result.zeit}. ` +
            `Stornocode: ${result.stornocode}. ` +
            `Bitte diesen Code sicher aufbewahren.`,
            'success'
        );

        form.reset();
        resetTimes();

    } catch (error) {
        showMessage(error.message, 'error');
        await loadTimes();

    } finally {
        submitButton.disabled = false;
    }
});

leistung.addEventListener('change', async () => {
    await loadEmployees();
    await loadTimes();
});

mitarbeiter.addEventListener('change', loadTimes);
datum.addEventListener('change', loadTimes);

// Start
const today = new Date();
datum.min = localDateString(today);

const maxDate = new Date(today);
maxDate.setMonth(maxDate.getMonth() + 3);
datum.max = localDateString(maxDate);

loadServices();



 // ========================================
 // TERMIN STORNIEREN
 // ========================================

const cancelForm = document.getElementById('cancelForm');
const cancelMessage = document.getElementById('cancelMessage');

cancelForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    cancelMessage.textContent = '';
    cancelMessage.className = '';

    const stornocode = document
        .getElementById('stornocode')
        .value
        .trim();

    const button = cancelForm.querySelector('button');
    button.disabled = true;

    try {
        const result = await apiRequest('/api/stornieren', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ stornocode })
        });

        cancelMessage.textContent = result.message;
        cancelMessage.className = 'success';

        cancelForm.reset();

    } catch (error) {
        cancelMessage.textContent = error.message;
        cancelMessage.className = 'error';

    } finally {
        button.disabled = false;
    }
});
