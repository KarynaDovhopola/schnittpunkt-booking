
# Anforderungsliste – Friseursalon Schnittpunkt

Grundlage: Gesprächsprotokoll mit Sabine Kowalski,
Projektauftrag, Seiten 1–3.

## Funktionale Anforderungen

| ID | Anforderung | Bezug zum Gesprächsprotokoll |
|---|---|---|
| F-01 | Kunden können online Termine buchen. | „selbst einen Termin buchen“ |
| F-02 | Kunden wählen Leistung, Mitarbeiter oder „egal“, Datum und Uhrzeit. | „viele wollen zu Mara oder Jonas“ |
| F-03 | Bei „egal“ wird ein freier, qualifizierter Mitarbeiter zugewiesen. | „dann nimmt die Anwendung jemanden, der frei ist“ |
| F-04 | Kunden geben Name, Telefonnummer und E-Mail ein, ohne Kundenkonto. | „Ein Konto mit Passwort will keiner“ |
| F-05 | Kunden werden anhand ihrer E-Mail wiedererkannt. | „nicht alles neu tippen müssen“ |
| F-06 | Kunden können Termine mit einem individuellen Code stornieren. | „Ohne Login, aber so, dass nicht jeder fremde Termine löschen kann“ |
| F-07 | Das Salonteam kann gebuchte Termine stornieren. | „Ich selbst muss jeden Termin jederzeit stornieren können“ |
| F-08 | Stornierte Termine bleiben gespeichert. | „Die Termine will ich nicht löschen“ |
| F-09 | Termine können als erledigt markiert werden. | „wenn jemand da war, hake ich das ab“ |
| F-10 | Das Salonteam sieht eine Tagesübersicht mit Mitarbeiter-Spalten. | „Ein Tag auf einen Blick“ |
| F-11 | Das Salonteam kann Leistungen anlegen und Preise ändern. | „Auch neue Leistungen will ich selbst eintragen“ |

## Buchungsregeln

| ID | Anforderung | Bezug zum Gesprächsprotokoll |
|---|---|---|
| R-01 | Keine zeitlich überlappenden Termine pro Mitarbeiter. | „jede Person nur einen Termin gleichzeitig“ |
| R-02 | Die Dauer hängt von der gewählten Leistung ab. | Angaben zu Minuten je Leistung |
| R-03 | Termine beginnen im 15-Minuten-Raster. | „Gebucht wird im Viertelstundentakt“ |
| R-04 | Termine müssen vollständig in die Öffnungszeiten passen. | „Ein Termin muss komplett in die Öffnungszeit passen“ |
| R-05 | Nur für die Leistung qualifizierte Mitarbeitende sind auswählbar. | „sonst bucht jemand Färben bei Jonas“ |
| R-06 | Buchungen: mindestens 2 Stunden Vorlauf, höchstens 3 Monate im Voraus. | „mindestens zwei Stunden vorher“ |
| R-07 | Kunden dürfen nur bis 24 Stunden vor Beginn selbst stornieren. | „Bis 24 Stunden vorher“ |

## Nicht-funktionale Anforderungen

| ID | Anforderung | Bezug zum Gesprächsprotokoll |
|---|---|---|
| N-01 | Der Salon-Bereich ist durch ein Passwort geschützt. | „ein Passwort für mich und das Team reicht“ |
| N-02 | Die öffentliche Buchungsseite zeigt keine fremden Kundendaten. | „darf niemand sehen, wer sonst noch gebucht hat“ |
| N-03 | Online-Buchungen sind unabhängig von den Öffnungszeiten der Website möglich. | „auch abends um zehn“ |

## Technische Anforderungen

- Frontend: HTML, CSS, Vanilla JavaScript und Fetch API
- Backend: Node.js, Express und REST API
- Datenbank: MySQL mit mindestens drei verknüpften Tabellen
- SQL-Abfragen mit Platzhaltern
- Serverseitige Eingabevalidierung
- Zugangsdaten in einer `.env`-Datei
- SQL-Skript mit Beispieldaten
- ER-Diagramm
- README und nachvollziehbarer Git-Verlauf

## Optionale Anforderungen

- Bestätigungs-E-Mail
- Mehrere Leistungen pro Termin
- Freie Tage und Urlaub pro Mitarbeiter
- Wochenansicht
- Einfache Auswertungen

Diese Erweiterungen gehören nicht zum Pflichtumfang.
