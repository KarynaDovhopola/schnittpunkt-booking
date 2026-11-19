
# ER-Diagramm – Schnittpunkt

```mermaid
erDiagram
    KUNDEN ||--o{ TERMINE : bucht
    MITARBEITER ||--o{ TERMINE : bearbeitet
    LEISTUNGEN ||--o{ TERMINE : beinhaltet
    MITARBEITER ||--o{ MITARBEITER_LEISTUNGEN : bietet
    LEISTUNGEN ||--o{ MITARBEITER_LEISTUNGEN : wird_angeboten

    KUNDEN {
        INT id PK
        VARCHAR name
        VARCHAR telefon
        VARCHAR email UK
    }

    MITARBEITER {
        INT id PK
        VARCHAR name
        BOOLEAN aktiv
    }

    LEISTUNGEN {
        INT id PK
        VARCHAR name UK
        INT dauer_minuten
        DECIMAL preis
        BOOLEAN aktiv
    }

    MITARBEITER_LEISTUNGEN {
        INT mitarbeiter_id PK,FK
        INT leistung_id PK,FK
    }

    TERMINE {
        INT id PK
        INT kunde_id FK
        INT mitarbeiter_id FK
        INT leistung_id FK
        DATETIME beginn
        DATETIME ende
        ENUM status
        VARCHAR stornocode UK
        DECIMAL preis_zum_zeitpunkt
    }
```

## Beziehungen

- Ein Kunde kann mehrere Termine buchen.
- Ein Mitarbeiter kann mehrere Termine übernehmen.
- Eine Leistung kann in mehreren Terminen vorkommen.
- Mitarbeiter und Leistungen haben eine n:m-Beziehung.
- Die Tabelle `mitarbeiter_leistungen` bildet diese n:m-Beziehung ab.
- Jeder Termin verweist auf genau einen Kunden, einen Mitarbeiter und eine Leistung.

## Hinweise

`PK` bedeutet Primärschlüssel.

`FK` bedeutet Fremdschlüssel.

`UK` bedeutet eindeutiger Schlüssel (UNIQUE).

Der Preis zum Buchungszeitpunkt bleibt im Termin gespeichert.
