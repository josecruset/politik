# Geprüfte Themenimporte

Stand 12.10.2026. Die Anwendung liefert `topics.json` über `/api/context` aus. Diese Daten sind ein versionierter, geprüfter Import und werden **nicht** zusammen mit den Parteiumfragen alle 15 Minuten aktualisiert. Frage, Population, Datierung, letzte Prüfung und Quellen stehen in der Oberfläche. Frühere oder neuere Quellen können ergänzt werden.

| Reihe | Import | Bezugsgröße |
| --- | --- | --- |
| Forschungsgruppe Wahlen: Politbarometer | 149 Erhebungen, Januar 2019 bis 8.10.2026 | Bis zu zwei Probleme unter Wahlberechtigten; zwölf Kategorien aus den beiden offiziellen Langzeitdateien, keine vollständige Antwortliste |
| CIS | Juli und September 2026, Studien 3571/3577 | Drei spontane Nennungen, Spalte TOTAL der gewichteten Ergebnistabellen, spanische Bevölkerung ab 18 |
| CEO | Welle 3/2025 und 1/2026, REO 1145/1167 | Frage 1: mehrere Probleme unter allen Befragten; nicht Frage 2 mit eingeschränkter Basis |
| Barcelona | Wellen 1/2025, 2/2025, 1/2026 | Eine spontane Nennung, `PROB_BCN`, kommunal Wahlberechtigte ab 18, offizielle Gewichte `PES` |

Die genauen Originalfragen, Datierungen und direkten Downloadlinks stehen im Manifest `topic-sources.json`. Die aktuelle Politbarometer-Feldzeit 5.–7.10.2026 wurde aus [der Pressemitteilung](https://www.forschungsgruppe.de/Aktuelles/Politbarometer/) übernommen. Historische Feldzeiten sind in den Langzeitdateien nicht angegeben; ihre Datierungen bleiben Quellendaten und werden nicht als erfundene Feldzeiten angezeigt. Die CIS-Feldzeiten wurden aus den offiziellen technischen Blättern (FT3571/FT3577) geprüft. Die CEO-Feldzeiten stehen im Methodikteil der Ergebnistabellen. Barcelona-Feldzeiten und Population kommen aus den offiziellen Erhebungsmetadaten.

Exakte Quellencategorien sind die stabilen Schlüssel innerhalb jeder Reihe. Neue Kategorien erzeugen neue Schlüssel, fehlende Kategorien und leere Zellen bleiben fehlend. Keine Nullauffüllung, keine Verbindung einer Linie über eine Erhebung ohne Beobachtung dieser Kategorie. Umbenennungen werden ohne zusätzliche fachliche Prüfung nicht zusammengeführt. Die vier Reihen werden weder miteinander gemischt noch geglättet. Änderungen des Erhebungsmodus im historischen Politbarometer können die Vergleichbarkeit beeinflussen. Barcelona zeigt die detaillierten Codes der Rohantworten; die zusammenfassenden Kategorien mancher Presseberichte sind eine andere Aggregation.

Deutsche Länderansichten zeigen explizit **bundesweiten Kontext**, keine vermeintliche Landes-Themenumfrage. ARD-DeutschlandTrend ist nicht importiert: Reihen verschiedener Institute und Fragen dürfen nicht stillschweigend kombiniert werden. Die importierten spanischen und katalanischen Reihen haben zunächst nur zwei Erhebungen. Kein Vollständigkeitsanspruch.

## Erneuter Import und Ergänzung

Maintainer benötigen Python 3, `openpyxl` (nur Lesen der offiziellen XLSX) und `pdftotext` (Poppler). Die laufende Node-Anwendung benötigt diese Werkzeuge nicht.

```sh
python3 scripts/import_topics.py --cache /tmp/politik-topic-sources
python3 -m unittest discover -s test -p '*_test.py'
npm test
```

Ohne vorhandene Cache-Dateien lädt der Import die **explizit im Manifest registrierten offiziellen URLs**. Downloads sind mit SHA-256 festgehalten. Eine geänderte Datei stoppt den Import bis zur Quellenprüfung; der Hash darf erst nach inhaltlicher Prüfung aktualisiert werden. PDF-Formatänderungen und unplausible Prozentwerte stoppen ebenfalls. Erst nach vollständigem Erfolg wird `topics.json` atomar ersetzt. Rohantworten werden nicht veröffentlicht, nur aggregierte Prozentwerte.

Neue Wellen: Originalfrage/Population/Methodik vergleichen, Feldzeit und Quelle verifizieren, Dokument mit Downloadlink und Hash registrieren, ggf. neue Vergleichsreihe anlegen, Import ausführen und konkrete Werte gegen die Originaltabelle prüfen. Danach Datenstand im Manifest fortschreiben und Tests/UI kontrollieren. Keine automatische Entdeckung von CIS/CEO-Wellen oder unbeaufsichtigte Automation zugesagt.

Quellen: FGW bittet um Zitierung „Forschungsgruppe Wahlen: Politbarometer“ mit Datum. CIS-Datenkatalog weist CC BY 4.0 aus. Barcelona: CC BY 4.0, eigene gewichtete Aggregation. CEO: offizielle Veröffentlichung mit Quellenangabe; keine neu zugesagte offene Lizenz. Links bleiben direkt bei jeder Erhebung sichtbar.
