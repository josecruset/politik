# Kuratierte politische Ereignisse

`events.json` enthält eine redaktionelle Auswahl belegter Ereignisse ab 2019. Recherche und Prüfung dieser Ausgabe: **12. Oktober 2026**. Die Auswahl ist weder eine vollständige Chronik noch eine Rangliste der mutmaßlich wichtigsten Einflüsse auf Umfragen. Sie behauptet keine Ursache-Wirkungs-Beziehung zwischen Ereignissen und Veränderungen der Kurven.

Die vorhandenen lokalen Umfragedaten reichen teilweise deutlich weiter zurück: Bundestag ab September 2017, einzelne Landesblätter ab 2016 und Congreso ab 1977; Katalonien beginnt im April 2021 und Barcelona im Dezember 2019. Die Ereignisrecherche deckt bewusst den gemeinsamen jüngeren Zeitraum ab 2019 ab. Einträge außerhalb des tatsächlich vorhandenen Umfragezeitraums eines ausgewählten Gebiets gehören nicht auf dessen Grafik. Eine leere Stelle bedeutet keine Aussage, dass dort nichts politisch Relevantes geschehen sei.

## Auswahl und Quellen

Aufgenommen werden Wechsel im Regierungsamt, größere Krisen, bedeutende politische Beschlüsse und verifizierbare politische Aussagen. Primärquellen stammen von Parlamenten, Regierungen, Gerichten, Gesetzblättern oder zuständigen Kommunalbehörden. Jede Quelle ist ein direkter Beleg, keine Suchergebnisseite. Quelle, Datum, Gebietszuordnung und die eng gefasste Beschreibung wurden vor Aufnahme geprüft. Eine offizielle Quelle macht deren politische Beurteilungen nicht automatisch zu neutralen Tatsachen; solche Wertungen werden nicht übernommen.

**Wahlen und deren Ergebnisse sind ausgeschlossen.** Die bestehenden großen Wahlpunkte bleiben dafür zuständig. Parlamentarische Investituren und Amtsantritte sind dagegen Regierungsbildungen, die gesondert datiert sind. Ankündigung, Parlamentsbeschluss, Veröffentlichung und Inkrafttreten werden ausdrücklich unterschieden. Für Lindner ist der 6. November 2024 die Ankündigung, nicht die formelle Entlassung; für Illa wird der Amtsantritt am 10. August 2024 gezeigt, nicht zusätzlich die Investitur vom 8. August. Am 24. Februar 2022 beginnt Russlands großangelegte Invasion der Ukraine: Der Krieg bestand bereits seit 2014.

Das wörtliche Scholz-Zitat ist ein kurzer Auszug aus der von der Bundesregierung veröffentlichten Regierungserklärung. Sprecher und konkreter Anlass werden zusammen mit dem Originalwortlaut gespeichert. Neue Aussagen ohne solchen Beleg werden nicht aufgenommen. Übersetzungen dürfen nicht als Originalzitat ausgegeben werden.

## Gebietszuordnung

- `country: "de"` oder `"es"` und `regions: ["all"]`: landesweites Ereignis, das auch in den regionalen Reihen dieses Landes sichtbar werden darf. Das bedeutet nicht, dass alle Gebiete gleichermaßen betroffen waren.
- `country: "all"` und `regions: ["all"]`: internationaler Kontext für beide Länder, hier Russlands großangelegte Invasion der Ukraine.
- Konkrete IDs entsprechen `src/regions.js` und `src/countries.js`. Katalanische Regierung, Wasserkrise und ähnliche regionale Ereignisse können `katalonien` und `barcelona` betreffen; kommunale Entscheidungen dagegen nur `barcelona`.
- Die DANA-Katastrophe wird landesweit zugeordnet, weil eine nationale Krisenreaktion dokumentiert ist; die Beschreibung nennt ausdrücklich den regionalen Schwerpunkt Valencia. Sie behauptet keine Überflutung Barcelonas.

## Ergänzen und prüfen

Die Datei wird im Repository versioniert und mit der Anwendung ausgeliefert. Sie wird **nicht** automatisch durch eine ungeprüfte Nachrichtensuche ersetzt und nicht im 15-Minuten-Takt neu recherchiert. Es gibt keine wiederkehrende Automation.

Für eine Ergänzung:

1. Primärbeleg öffnen und tatsächliches Ereignisdatum feststellen. Ist nur eine Ankündigung belegt, genau diese beschreiben. Bei widersprüchlichen Datierungen einen belastbar belegten Ereignisschritt wählen oder den Eintrag bis zur Klärung zurückstellen.
2. Bestehende IDs, Titel und Ereignisse prüfen und Duplikate zusammenführen; Berichte über dasselbe Ereignis nicht als mehrere Marker eintragen.
3. Eine dauerhafte, sprechende `id`, ISO-Datum, Land, gültige Gebiets-IDs, Kategorie (`government`, `crisis`, `decision`, `statement`), neutralen Titel, kurze Beschreibung sowie `source.title`, `source.url` und `verifiedAt` ergänzen. Alle URLs müssen HTTPS verwenden.
4. Bei `statement` zusätzlich `quote`, `speaker` und `occasion` verlangen. Originalwortlaut im vollständigen Zusammenhang prüfen; Zitat kurz halten, Auslassungen kennzeichnen und keine unterstellte Umfragewirkung formulieren.
5. Reihenfolge nach Ereignisdatum herstellen. Datensatz- und Regressionstests ausführen. UI-Zuordnung im betroffenen Land/Gebiet, Markerposition, Kategorienfilter und Quellenlink prüfen.
6. Änderung mit Quellenbelegen zur normalen Code- und Inhaltsprüfung vorlegen. Später korrigierte Fakten im bestehenden Eintrag berichtigen und `verifiedAt` aktualisieren; bei geänderten URLs den erreichbaren Originalbeleg suchen.

Eintragszahl, fehlende Jahre oder fehlende Ereignisse für einzelne Länder/Bundesländer sind kein automatisch zu erfüllendes Soll. Belastbarkeit geht vor scheinbarer Vollständigkeit. Der Verifizierungsstand ist ein Prüfdatum, keine Garantie dauerhaft erreichbarer externer Seiten.
