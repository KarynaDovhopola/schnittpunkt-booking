
# Schnittpunkt – Online-Terminbuchung

## Projektbeschreibung

Schnittpunkt ist eine Fullstack-Webanwendung zur Online-Terminbuchung für einen Friseursalon.

Kundinnen und Kunden können ohne Benutzerkonto eine Leistung, eine passende Mitarbeiterin oder einen passenden Mitarbeiter, ein Datum und eine freie Uhrzeit auswählen. Anschließend können sie einen Termin buchen und mit einem individuellen Stornocode wieder stornieren.

Für das Salonteam gibt es einen passwortgeschützten Verwaltungsbereich.

## Verwendete Technologien

- HTML5
- CSS3
- JavaScript (Vanilla JavaScript)
- Fetch API
- Node.js
- Express
- MySQL
- mysql2/promise
- dotenv
- Git

## Funktionen

### Kundenbereich

- Leistungen mit Dauer und Preis anzeigen
- Passende Mitarbeitende auswählen
- Auswahl „Egal – wer frei ist“
- Freie Termine nach Datum anzeigen
- Termine online buchen
- Buchungsbestätigung mit Stornocode anzeigen
- Termine mit Stornocode stornieren

### Salon-Bereich

- Anmeldung mit gemeinsamem Salon-Passwort
- Tagesübersicht mit Spalten für Mitarbeitende
- Zwischen Kalendertagen wechseln
- Kundennamen, Telefonnummern und Leistungen anzeigen
- Termine als erledigt markieren
- Termine durch das Salonteam stornieren
- Leistungen anlegen
- Namen, Dauer und Preise bestehender Leistungen ändern
- Abmelden

## Buchungsregeln

Die Buchungsregeln werden serverseitig überprüft.

**Öffnungszeiten:**

- Montag: geschlossen
- Dienstag bis Freitag: 09:00–18:00 Uhr
- Samstag: 09:00–14:00 Uhr
- Sonntag: geschlossen

**Weitere Regeln:**

- Buchungsbeginn nur im 15-Minuten-Raster
- Ein Termin muss vollständig in die Öffnungszeit passen
- Buchung mindestens zwei Stunden im Voraus
- Buchung höchstens drei Kalendermonate im Voraus
- Keine Doppelbuchung einer Person
- Nur Mitarbeitende mit passender Qualifikation können ausgewählt werden
- Bei „Egal“ wird eine verfügbare Person ausgewählt
- Kundenstornierung bis spätestens 24 Stunden vor Terminbeginn
- Stornierte Termine bleiben in der Datenbank gespeichert
- Das Salonteam kann gebuchte Termine unabhängig von der 24-Stunden-Frist stornieren

## Installation

### Voraussetzungen

- Node.js und npm
- MySQL Server
- Ein MySQL-Benutzer mit Berechtigungen für die Projektdatenbank

### 1. Repository herunterladen

Das Projekt herunterladen oder mit Git klonen.

Im Projektordner ein Terminal öffnen.

### 2. Abhängigkeiten installieren

```bash
npm install
```

### 3. Datenbank einrichten

MySQL Workbench öffnen.

Das SQL-Skript aus dem Verzeichnis `database` ausführen:

`database/schema.sql`

Das Skript enthält die Struktur der Datenbank und Beispieldaten.

### 4. Umgebungsvariablen konfigurieren

Im Projektordner eine Datei `.env` anlegen.

Folgende Variablen eintragen und eigene Zugangsdaten verwenden:

```dotenv
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=EIGENES_MYSQL_PASSWORT
DB_NAME=schnittpunkt

SALON_PASSWORD=EIGENES_SALON_PASSWORT
SALON_SESSION_SECRET=EIGENER_ZUFAELLIGER_GEHEIMER_SCHLUESSEL
```

Der geheime Sitzungsschlüssel kann mit folgendem Befehl erzeugt werden:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Die `.env`-Datei enthält vertrauliche Informationen und darf nicht in Git eingecheckt werden.

### 5. Server starten

```bash
node src/server.js
```

Bei erfolgreichem Start ist die Anwendung unter folgenden Adressen erreichbar:

Kundenbereich:

http://localhost:3000

Salon-Bereich:

http://localhost:3000/salon.html

Der Server muss während der Nutzung laufen.

## Projektstruktur

```text
schnittpunkt-booking/
├── database/
│   └── schema.sql
├── public/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── salon.html
├── src/
│   ├── server.js
│   ├── db.js
│   ├── bookingRules.js
│   ├── availability.js
│   ├── bookingRouter.js
│   ├── cancelRouter.js
│   └── salonRouter.js
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## REST-API

### Öffentliche Endpunkte

| Methode | Route | Beschreibung |
|---|---|---|
| GET | /api/health | Serverstatus |
| GET | /api/leistungen | Aktive Leistungen |
| GET | /api/mitarbeiter | Aktive Mitarbeitende |
| GET | /api/leistungen/:id/mitarbeiter | Passende Mitarbeitende |
| GET | /api/zeiten | Verfügbare Uhrzeiten |
| POST | /api/termine | Termin buchen |
| POST | /api/stornieren | Termin mit Code stornieren |

### Geschützter Salon-Bereich

| Methode | Route | Beschreibung |
|---|---|---|
| POST | /api/salon/login | Anmeldung |
| POST | /api/salon/logout | Abmeldung |
| GET | /api/salon/session | Sitzung prüfen |
| GET | /api/salon/termine | Tagesübersicht |
| PATCH | /api/salon/termine/:id/status | Terminstatus ändern |
| GET | /api/salon/leistungen | Leistungen verwalten |
| POST | /api/salon/leistungen | Neue Leistung anlegen |
| PUT | /api/salon/leistungen/:id | Leistung bearbeiten |

Die geschützten Routen benötigen eine gültige Salon-Sitzung.

## Datenbankmodell

Die Anwendung verwendet fünf miteinander verbundene Tabellen:

- `kunden`: Kundendaten
- `mitarbeiter`: Mitarbeitende
- `leistungen`: Leistungen, Dauer und Preis
- `mitarbeiter_leistungen`: Zuordnung von Mitarbeitenden zu Leistungen
- `termine`: Buchungen mit Beginn, Ende und Status

Primär- und Fremdschlüssel bilden die Beziehungen ab.

Beim Buchen wird der aktuelle Leistungspreis zusätzlich im Termin gespeichert, damit spätere Preisänderungen bestehende Buchungen nicht verändern.

## Annahmen und Entscheidungen

### Wiederkehrende Kundschaft

Kundinnen und Kunden werden anhand ihrer E-Mail-Adresse wiedererkannt.

### Preisänderungen

Der Preis zum Buchungszeitpunkt wird im Termin gespeichert.

### Auswahl „Egal“

Bei mehreren verfügbaren Mitarbeitenden wird eine passende freie Person durch das Backend ausgewählt.

### Stornierung

Ein individueller Stornocode ermöglicht die Kundenstornierung ohne Benutzerkonto. Stornierte Termine werden nicht gelöscht, sondern erhalten den Status `storniert`.

### Salon-Zugang

Das Salonteam verwendet ein gemeinsames Passwort. Das Passwort und der Sitzungsschlüssel werden über Umgebungsvariablen konfiguriert.

### Neue Leistungen

Leistungen können im Salon-Bereich angelegt und bearbeitet werden. Die Zuordnung neu angelegter Leistungen zu Mitarbeitenden erfolgt in der aktuellen Version noch über die Datenbank.

### Nicht umgesetzte Zusatzfunktionen

E-Mail-Bestätigungen, mehrere Leistungen pro Termin, Urlaubstage, Wochenansicht und Auswertungen gehören nicht zum implementierten Funktionsumfang.

## Hinweise zur Sicherheit

- Datenbankzugangsdaten stehen in `.env`
- SQL-Abfragen verwenden Platzhalter
- Buchungsregeln werden im Backend geprüft
- Kundendaten der Tagesübersicht werden nur über geschützte API-Routen ausgegeben
- Sitzungen werden mit einem signierten Cookie verwaltet

Die Anwendung wurde für ein Schulprojekt entwickelt und ist nicht ohne weitere Sicherheitsmaßnahmen für den öffentlichen Produktivbetrieb vorgesehen.

## Testfälle

Folgende Szenarien sind für die Funktionsprüfung vorgesehen:

1. Verfügbare Leistungen und Mitarbeitende abrufen
2. Termin an einem geöffneten Tag buchen
3. Doppelbuchung derselben Person verhindern
4. Buchungen außerhalb der Öffnungszeiten ablehnen
5. Buchungen in der Vergangenheit ablehnen
6. Termin mit Stornocode stornieren
7. Stornierten Termin weiterhin in der Verwaltung anzeigen
8. Ohne Anmeldung keinen Zugriff auf Kundendaten erhalten
9. Termin im Salon-Bereich als erledigt markieren
10. Termin im Salon-Bereich stornieren
11. Leistungen anzeigen, anlegen und bearbeiten

## Start und Abgabe

Zur Abgabe gehören:

- Der vollständige Quellcode
- Das SQL-Skript mit Beispieldaten
- Die README
- Eine Anforderungsliste mit Bezug zum Gesprächsprotokoll
- Ein ER-Diagramm
- Die Git-Historie

Die Datei `.env` und der Ordner `node_modules` gehören nicht in das Repository.
