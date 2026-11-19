CREATE DATABASE IF NOT EXISTS schnittpunkt
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE schnittpunkt;



CREATE TABLE IF NOT EXISTS mitarbeiter (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    aktiv BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO mitarbeiter (name)
VALUES
    ('Sabine Kowalski'),
    ('Mara'),
    ('Jonas');



CREATE TABLE IF NOT EXISTS leistungen (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    dauer_minuten INT NOT NULL,
    preis DECIMAL(8,2) NOT NULL,
    aktiv BOOLEAN NOT NULL DEFAULT TRUE,
    CHECK (dauer_minuten > 0),
    CHECK (preis >= 0)
);


INSERT INTO leistungen (name, dauer_minuten, preis)
VALUES
    ('Herrenschnitt', 30, 28.00),
    ('Damenschnitt', 45, 42.00),
    ('Waschen und Föhnen', 30, 22.00),
    ('Kinderschnitt', 20, 16.00),
    ('Bartpflege', 15, 12.00),
    ('Färben', 90, 75.00);



CREATE TABLE IF NOT EXISTS mitarbeiter_leistungen (
    mitarbeiter_id INT NOT NULL,
    leistung_id INT NOT NULL,

    PRIMARY KEY (mitarbeiter_id, leistung_id),

    FOREIGN KEY (mitarbeiter_id)
        REFERENCES mitarbeiter(id),

    FOREIGN KEY (leistung_id)
        REFERENCES leistungen(id)
);


INSERT INTO mitarbeiter_leistungen
    (mitarbeiter_id, leistung_id)
VALUES
    -- Sabine: все услуги
    (1, 1),
    (1, 2),
    (1, 3),
    (1, 4),
    (1, 5),
    (1, 6),

    -- Mara: все услуги
    (2, 1),
    (2, 2),
    (2, 3),
    (2, 4),
    (2, 5),
    (2, 6),

    -- Jonas: без Damenschnitt и Färben
    (3, 1),
    (3, 3),
    (3, 4),
    (3, 5);


CREATE TABLE IF NOT EXISTS kunden (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    telefon VARCHAR(30) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE
);





CREATE TABLE IF NOT EXISTS termine (
    id INT AUTO_INCREMENT PRIMARY KEY,

    kunde_id INT NOT NULL,
    mitarbeiter_id INT NOT NULL,
    leistung_id INT NOT NULL,

    beginn DATETIME NOT NULL,
    ende DATETIME NOT NULL,

    status ENUM(
        'gebucht',
        'erledigt',
        'storniert'
    ) NOT NULL DEFAULT 'gebucht',

    stornocode VARCHAR(36) NOT NULL UNIQUE,

    preis_zum_zeitpunkt DECIMAL(8,2) NOT NULL,

    CHECK (ende > beginn),
    CHECK (preis_zum_zeitpunkt >= 0),

    FOREIGN KEY (kunde_id)
        REFERENCES kunden(id),

    FOREIGN KEY (mitarbeiter_id)
        REFERENCES mitarbeiter(id),

    FOREIGN KEY (leistung_id)
        REFERENCES leistungen(id)
);
