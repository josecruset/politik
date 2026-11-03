# USA: Umfragen und Polymarket

Quellen und Schnittstellen am 3. November 2026 live geprüft.

## Kongressumfragen

- Herausgeber: [Silver Bulletin – Generic Congressional Ballot](https://www.natesilver.net/p/generic-ballot-average-2026-nate-silver-bulletin-congress-polls).
- [Öffentlicher CSV-Download](https://docs.google.com/spreadsheets/d/e/2PACX-1vRsvXNCZ0ubJr8D_yNcU5q6C0_HBa35K7oDK03KpO7Ca43UwdXaIdvVLWoXEmHHph0EREz5430Hm5yZ/pub?output=csv), auf der Quellenseite unter „Every generic ballot poll in our database“ verlinkt. Enthält Institut, Feldzeit, Stichprobe, Bezugsgruppe, Erhebungs-ID und Originalquelle.
- Verwendet werden ausschließlich nationale Einzelumfragen (`subgroup=All polls`) und ihre unbereinigten Werte `dem`/`rep`. `adjusted_dem`, `adjusted_rep`, Gewichte und Modellwerte werden nicht übernommen.
- Eine Erhebung (`poll_id`) zählt einmal. Bei mehreren Bezugsgruppen gilt LV vor RV vor A, entsprechend der auf der Quellenseite beschriebenen Priorität. Bei gleicher Priorität bleibt die erste Quellzeile erhalten.
- Gleicher, ungewichteter gleitender 7-Kalendertage-Durchschnitt wie in den bestehenden Länderansichten. Die Karten zeigen die neueste Einzelumfrage nach Befragungsende; bei gleichem Datum entscheidet die Erhebungs-ID stabil. Die Quelle wird alle 15 Minuten abgefragt.
- Befragungsende, Population, Stichprobe und Originalquelle bleiben sichtbar. Fehlende Werte bleiben leer; keine Hochrechnung auf 100 %, keine Ableitung von US-Mandaten.
- Die Reihe umfasst den Wahlzyklus 2026; die Anwendung wechselt nach der Wahl nicht stillschweigend auf eine andere Wahl oder Fragestellung.

## Polymarket

- Öffentliche [Gamma-API, GET /events](https://docs.polymarket.com/api-reference/events/list-events), ohne Konto oder API-Schlüssel. Abfrage mit festem `slug`.
- [Repräsentantenhaus 2026](https://polymarket.com/event/which-party-will-win-the-house-in-2026): `which-party-will-win-the-house-in-2026`.
- [Senat 2026](https://polymarket.com/event/which-party-will-win-the-senate-in-2026): `which-party-will-win-the-senate-in-2026`.
- Jeweils die Parteimärkte `Democratic Party` und `Republican Party`; inaktive Platzhalter sind ausgeschlossen. `outcomePrices` wird über den Index von `Yes` in `outcomes` zugeordnet und mit 100 multipliziert. Kein letzter Handel und keine selbst berechnete Gegenwahrscheinlichkeit.
- Kurse unabhängiger Einzelmärkte werden nicht normalisiert: Sie können zusammen von 100 % abweichen. Marktpreise sind implizite Wahrscheinlichkeiten für Kammerkontrolle, keine gemessenen Wähleranteile. Originalmarkt und dessen Auflösungsregeln sind verlinkt.
- Eigener Server- und Browserabruf jede Minute, unabhängig von der Umfragequelle. Pro Kammer werden Originalkurszeit und erfolgreicher Abruf gespeichert. Ausfälle einer Kammer lassen die andere weiter aktualisieren. Alte Kurse erhalten keinen neuen erfolgreichen Abrufzeitpunkt; fehlende Kurse werden nicht als null Prozent dargestellt.
- Fehlgeschlagener Abruf, mehr als zwei Minuten alter Abruf oder ein aktiver Quellkurs älter als 15 Minuten wird als veraltet markiert. Geschlossene Märkte werden ausdrücklich als abgeschlossen angezeigt. Persistenz: `DATA_DIR/markets-us.json`.

Die USA-Ansicht blendet die für Deutschland/Spanien kuratierten Themen, Mandate und Chroniken aus. [US House](https://www.house.gov/the-house-explained) beschreibt die Wahlkreise und 435 stimmberechtigten Mitglieder; ein nationales Verhältniswahl-Sitzmodell wäre hier unzutreffend.
