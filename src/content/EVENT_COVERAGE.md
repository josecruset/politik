# Abdeckung der politischen Ereignischronik

Stand: **13. Oktober 2026**. Gesamtbestand **30 → 162 Einträge**: 132 geprüfte Ergänzungen. Verglichen wird mit Commit `2e0ced3`. Die Zahlen unten benutzen für beide Datensätze dieselben tatsächlichen Umfragezeiträume der lokalen API am Prüftag, nicht nur das gerade sichtbare Zwölfmonatsfenster. Standardfilter: „Zum ausgewählten Wahlgebiet“, „Alle Ereignistypen“.

Die Erweiterung enthält 48 bundesweite deutsche, 43 deutsche Landesereignisse sowie 41 spanische Ergänzungen. Alle 16 Bundesländer haben eigene regional zugeordnete Ereignisse. Die [Quellenprüfung](EVENT_SOURCE_REVIEW.md) beschreibt die recherchierten Pakete, Datumsabgrenzungen, ersetzte Archivlinks und Gegenbelege.

## Tatsächlich sichtbare Einträge nach Wahlgebiet

„Eigene“ zählt konkrete regionale Zuordnungen im Umfragezeitraum, ohne landesweiten und internationalen Kontext. Mehrfachzuordnungen sind bewusst möglich (Flut NRW/Rheinland-Pfalz/Bundestag, Katalonien/Barcelona); daher sind Regionszahlen nicht addierbar. „Außerhalb“ bezeichnet passende historische/aktuelle Ereignisse vor dem ersten oder nach dem letzten importierten Umfragepunkt.

| Wahlgebiet | Umfragezeitraum | Vorher | Jetzt sichtbar | Eigene | Außerhalb |
| --- | --- | ---: | ---: | ---: | ---: |
| Bundestagswahl | 2017-09-14 – 2026-10-11 | 11 | 61 | 3 | 1 |
| Baden-Württemberg | 2016-09-15 – 2026-04-10 | 10 | 58 | 2 | 5 |
| Bayern | 2019-01-03 – 2026-03-03 | 10 | 50 | 1 | 12 |
| Berlin | 2016-10-30 – 2026-10-08 | 12 | 63 | 4 | 0 |
| Brandenburg | 2019-11-19 – 2026-10-09 | 10 | 52 | 3 | 11 |
| Bremen | 2022-05-18 – 2026-08-19 | 5 | 32 | 1 | 29 |
| Hamburg | 2020-06-25 – 2026-09-30 | 9 | 47 | 2 | 16 |
| Hessen | 2019-04-26 – 2026-04-29 | 10 | 54 | 3 | 8 |
| Mecklenburg-Vorpommern | 2017-01-19 – 2026-09-17 | 10 | 61 | 3 | 1 |
| Niedersachsen | 2018-02-25 – 2026-09-11 | 10 | 58 | 2 | 3 |
| Nordrhein-Westfalen | 2017-09-03 – 2026-09-23 | 12 | 60 | 2 | 2 |
| Rheinland-Pfalz | 2016-06-22 – 2026-08-20 | 10 | 60 | 3 | 2 |
| Saarland | 2018-06-21 – 2025-12-03 | 9 | 48 | 1 | 12 |
| Sachsen | 2020-07-07 – 2026-05-21 | 8 | 42 | 1 | 19 |
| Sachsen-Anhalt | 2016-11-22 – 2026-09-03 | 10 | 62 | 4 | 1 |
| Schleswig-Holstein | 2018-04-20 – 2026-07-14 | 10 | 55 | 2 | 7 |
| Thüringen | 2020-01-28 – 2026-07-02 | 12 | 50 | 4 | 13 |
| Parlamentswahl (Congreso) | 1977-05-05 – 2026-10-09 | 9 | 36 | 0 | 0 |
| Katalonien | 2021-04-01 – 2026-10-01 | 10 | 32 | 10 | 16 |
| Barcelona | 2019-12-05 – 2026-06-05 | 15 | 45 | 17 | 11 |

## Jahres- und Kategorieabdeckung des Gesamtbestands

| Jahr | Einträge |
| --- | ---: |
| 2016 | 2 |
| 2017 | 9 |
| 2018 | 9 |
| 2019 | 13 |
| 2020 | 21 |
| 2021 | 19 |
| 2022 | 19 |
| 2023 | 15 |
| 2024 | 22 |
| 2025 | 19 |
| 2026 | 14 |

| Kategorie | Einträge |
| --- | ---: |
| Krisen | 17 |
| Politische Beschlüsse | 88 |
| Regierungsereignisse | 45 |
| Politikeraussagen | 12 |

106 Einträge betreffen Deutschland, 55 Spanien und ein internationaler Eintrag beide Länder. Zwölf Politikeraussagen enthalten acht kurze Originalzitate und vier ausdrücklich gekennzeichnete Zusammenfassungen. Die eigentlichen Quellen stehen bei jedem Eintrag in `events.json`.

## Bekannte Lücken und Auswahlgrenzen

- Schwerpunkt 2019–2026; 2016–2018 nur ausgewählte bedeutende Vorgänge. Die jahrzehntelange spanische Umfragegeschichte vor 2016 ist nicht systematisch erschlossen.
- Landesauswahl noch stark auf Regierungsbildungen ausgerichtet. Regionale Krisen, Beschlüsse, Oppositionserklärungen und gesellschaftliche Proteste sind ungleich verteilt. Saarland besitzt derzeit einen eigenen Eintrag; regionale Originalzitate fehlen. Nationale Aussagen liefern Kontext, ersetzen diese Lücke aber nicht.
- Die importierten Umfragen einiger Länder enden Monate vor dem Prüftag. Beispielsweise liegt der Amtsantritt Özdemirs im Mai 2026 nach dem letzten importierten Baden-Württemberg-Punkt im April. Solche Ereignisse sind gespeichert, erscheinen aber weder mit einem falschen Datum noch jenseits der Kurve. Die UI erklärt die ausgeblendete Anzahl.
- Zwei spanische Primärquellen sind beim direkten HTTP-Abruf serverseitig abgefangen (Wohnungsquote-PDF und Flughafen-Mitteilung). Historisches Datum und Kerninhalt wurden mit amtlichen Suchindexauszügen und zusätzlich erreichbaren Gegenbelegen geprüft; Details und alternative Links im Quellenprüfbericht.
- Entscheidungen und Regierungsschritte sind besser amtlich dokumentiert als Proteste oder Parteikonflikte. Kein Anspruch auf vollständige oder nach politischer Wirkung gewichtete Geschichte; keine automatisch erzeugte Kausalität, keine Ereignisquoten.
- Manuelle, versionierte Recherche; keine wiederkehrende Automation und kein Aktualisierungsversprechen im 15-Minuten-Takt für die Chronik.

## Erneut zählen und weiterpflegen

Der gemeinsame Filter in `public/event-data.js` wird von Liste, Markerleiste und Abdeckungsbericht verwendet. Nach jeder Inhaltsänderung kannst Du die Region-/Jahr-/Kategorieverteilung prüfen:

```sh
node scripts/event-coverage.js
npm test
python3 -m unittest discover -s test -p '*_test.py'
```

Der Bericht liest vorhandene lokale Umfragecaches, lädt keine Daten herunter und recherchiert keine Ereignisse. Fehlt ein Cache, werden `visible`, `start` und `end` als `null` ausgewiesen; `own` zählt dann den gesamten regionalen Bestand, nicht eine nachgewiesene sichtbare Zahl. Optional akzeptiert der Befehl eine frühere Ereignis-JSON und eine JSON mit API-geprüften Zeitgrenzen (`[{country, region, start, end}]`), um Vorher/Nachher unter identischen Zeitgrenzen zu vergleichen. Die Tabellen oben sind ein datierter Prüfstand, kein automatisch veränderliches Soll.

Neue Einträge nach dem [Kuratierungsworkflow](EVENTS.md) prüfen. Bei jeder Veröffentlichung zählt zusätzlich die tatsächlich gerenderte Oberfläche mit Standardfiltern, einschließlich Länderwechsel, Kategorien, Gruppenmarker, Quellen, horizontaler Scrollposition und schmalem Bildschirm.
