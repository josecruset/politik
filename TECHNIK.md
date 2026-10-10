# Technische Dokumentation

Diese Datei beschreibt Datenimport, Berechnung, lokale Entwicklung und Betrieb von Politik. Eine Einführung zur Nutzung findest Du in der [README](README.md).

Demo: [politik.cruset.com](https://politik.cruset.com), Server `207.180.217.99`.

## Darstellungsregeln

`public/theme.js` setzt das Farbschema vor dem Laden des Stylesheets. Der Schalter speichert `light` oder `dark` unter `politik-theme` im lokalen Browserspeicher. Ohne gespeicherte Auswahl folgt die Darstellung `prefers-color-scheme`, einschließlich späterer Systemänderungen. Ist der Browserspeicher gesperrt, funktioniert der Schalter für die aktuelle Sitzung. CSS-Variablen steuern Oberfläche, Achsen, Gitternetz, Wahlpunkt-Ränder und Tooltips; die Parteifarben bleiben erhalten. Die 5-%-Referenzlinie ist im dunklen Modus hell, damit sie sichtbar bleibt.

Die Auswahl rechts oben wechselt zwischen Deutschland (`de`) und Spanien (`es`). Deutschland bietet Bundestagswahl und alle Bundesländer; Spanien zunächst nur Congreso-Umfragen. Linienauswahl, Wahlgebiet und Zeitfenster werden je Ansicht während der Sitzung erhalten.

- AfD, Union, SPD, Grüne, Linke, BSW, FDP in dieser Reihenfolge, standardmäßig alle sichtbar. Die Karten zeigen die unveränderten Werte der neuesten Einzelumfrage; Datum und Institut stehen bei „Letzte Umfrage“. Bei mehreren Umfragen am gleichen Tag gilt die zuerst aufgeführte Umfrage der Quelle. Fehlende Werte bleiben leer (–), echte null Prozent werden angezeigt. Klick auf eine Karte schaltet die betreffende Linie um. Die Linien zeigen weiterhin den 7-Tage-Durchschnitt.
- Die Linienfarben entsprechen den effektiven Hintergrundfarben der bedingten Formatierung in Zeile 9 des Blatts `BUNDESTAGSWAHL`: `#009EE0`, `#005974`, `#E3000F`, `#008939`, `#B61C3E`, `#792351`, `#FFE209`.
- Horizontal scrollbar, ungefähr zwölf Monate pro Ansicht. Start beim neuesten Zeitraum. Auch per Touch oder Tastatur bedienbar.
- Mauszeiger oder Tippen auf das Diagramm zeigt Werte für einen Tag.
- Bundestagswahlergebnisse erscheinen als größere Punkte mit Tooltip „Bundestagswahl“. Wiederholte Wahlergebniszeilen an Abschnittsgrenzen ergeben einen Punkt je Partei und Wahl. Bei mehreren Fassungen gilt die zuerst aufgeführte Fassung.
- Das Dropdown an der Diagrammüberschrift bietet Bundestagswahl und alle 16 Bundesländer. Bei einer Länderauswahl erscheinen dessen Landesumfragen, CDU bzw. CSU und zusätzliche Parteien aus eigenen Parteispalten. Die bisherigen sieben Parteien behalten ihre Reihenfolge; Landesparteien werden angehängt.
- Regierungs- und Kanzlerzufriedenheit sind nur bei Bundestagswahl separat zuschaltbar, standardmäßig ausgeschaltet. In Länderansichten sind die Schalter ausgeblendet. Beim Zurückwechseln bleibt die Auswahl der Linien erhalten.
- Die Y-Achse beginnt bei 0 % und passt sich den eingeschalteten Kurven und Wahlpunkten im sichtbaren Zeitraum an. Die Obergrenze liegt zwei Prozentpunkte über dem höchsten sichtbaren Wert und wird auf die nächsten 5 Prozentpunkte aufgerundet (mindestens 10 %, höchstens 100 %). Verbundene Linien an den sichtbaren Zeitgrenzen werden berücksichtigt. Nach einer kurzen Scrollpause erfolgt die Anpassung mit einer 240-ms-Animation; bei reduzierter Bewegung ohne Animation.
- Die schwarze Referenzlinie liegt bei 5 %, auch beim Wechsel der Achsenskalierung.

## Daten und Berechnung

Deutsche Quelle: [Deutschland Wählt Umfragen-Verlauf](https://docs.google.com/spreadsheets/d/1aT2f8yc8p9-XjOqFCTQ1nDeP5GEORu9QZDOtUwF8smI/htmlview).

Vollständige öffentliche CSV-Exporte mit folgenden Blatt-IDs:

| Blatt | gid |
| --- | --- |
| BUNDESTAGSWAHL | 2003908598 |
| Zufriedenheit Bundesregierung | 1264011241 |
| Zufriedenheit Bundeskanzler | 667187835 |

Das Blatt mit `gid=667187835` enthält die Kanzlerzufriedenheit. Die Bundesansicht lädt diese drei Blätter einzeln. Die Blatt-IDs aller Länder stehen in `src/regions.js`. Länderblätter werden beim ersten Aufruf geladen und danach ebenfalls alle 15 Minuten aktualisiert. Jedes Wahlgebiet hat einen eigenen persistenten JSON-Cache; ein Fehler in einem Länderblatt beeinträchtigt die anderen Ansichten nicht.

Pro Partei und Tag: arithmetisches Mittel aller veröffentlichten Umfragewerte vom jeweiligen Tag und den sechs vorhergehenden Kalendertagen. Jede Umfrage hat dasselbe Gewicht, auch mehrere am selben Tag. Keine Gewichtung nach Institut oder Stichprobengröße. Fehlende Werte werden ausgelassen; echte `0%` bleiben gültig. Wahlresultate und Zusammenfassungszeilen gehen nicht in den Durchschnitt ein. Die Linie verbindet vorhandene Durchschnittswerte auch über Umfragepausen hinweg, etwa an Jahreswechseln. Für solche Tage werden keine Tageswerte erfunden; im Tooltip gibt es ohne gültiges 7-Tage-Fenster keinen Messwert. Der berechnete Verlauf endet am letzten veröffentlichten Umfragedatum; die Datierung wird angezeigt.

Länderansichten verwenden nur Landeswahlergebnisse als größere Punkte (Landtagswahl, Bürgerschaftswahl oder Abgeordnetenhauswahl). Ergebnisse von Bundestags- und Europawahlen werden dort ausgelassen und gehen ebenso wenig in die Durchschnitte ein. Wahlabend-Prognosen und Hochrechnungen sind keine Umfragen und bleiben ebenfalls ausgeschlossen. Wahlzeilen ohne vorhandene Prozentwerte werden nicht markiert. Berlin wird auf „Berlin Gesamt“ begrenzt; „Berlin West“ und Zeilen ohne Institut werden nicht als Umfragen verwendet.

Historische Abschnitte haben andere Parteispalten: Der Import ordnet die Spalten bei jeder wiederholten Überschrift neu zu. BSW wird vor seiner Erfassung nicht als null Prozent behandelt.

Zufriedenheit: F+G je Umfrage am Veröffentlichungstag. Ist nur eine der beiden Prozentzellen vorhanden, wird diese verwendet. Aus diesen Summen wird pro Tag der gleitende 7-Tage-Durchschnitt berechnet: aktueller Tag und sechs vorherige Kalendertage, jede Umfrage gleich gewichtet. Fortsetzungszeilen ohne eigenes Datum übernehmen Datum und Institut der unmittelbar zugehörigen Umfrage; Leer- und Abschnittszeilen unterbrechen diese Zuordnung. Nicht prozentuale Bewertungen, etwa auf einer Skala von −5 bis +5, bleiben ausgeschlossen. Mehrere Beobachtungen am selben Datum bleiben erhalten. Linien verbinden vorhandene Durchschnittswerte auch über Umfragepausen hinweg. Der Tooltip zeigt den Durchschnitt und die Zahl der Umfragen im jeweiligen 7-Tage-Fenster; bei einem leeren Fenster erscheint kein Wert.

Server und geöffnete Browseransicht aktualisieren alle 15 Minuten. Die Quelldatei muss öffentlich lesbar bleiben. Bei einem Quellenfehler verwendet der Server seinen letzten erfolgreichen Cache und kennzeichnet ihn als veraltet. Ein Neustart behält den Cache im Docker-Volume. Ohne verfügbaren Cache liefert `/api/data` HTTP 503 und die Oberfläche einen Wiederholen-Knopf.

### Spanische nationale Daten

`src/spain.js` lädt [Bismuths öffentlichen JSON-Endpunkt](https://bismuthmedia.net/api/v1/countries/spain). Akzeptiert werden Schema-Version 1, Land `spain`, freigegebene Veröffentlichung und bestandene Quellenprüfung. Das [Datenformat](https://bismuthmedia.net/data) liefert einzelne Umfragen, Parteifarben und historische Parteispalten. Die Anwendung verwendet ausschließlich diese Einzelwerte, nicht Bismuths eigenen Trend.

Die Datierung ist das Ende des Befragungszeitraums (`end`), nicht der Veröffentlichungstag. Ungültige oder zukünftige Befragungsdaten, fehlende Institute und Umfragen ohne verwertbare Werte werden ausgelassen; doppelte Umfrage-IDs zählen einmal. Prozentwerte müssen Zahlen zwischen 0 und 100 sein; fehlende Werte bleiben `null`. Der identische ungewichtete 7-Kalendertage-Durchschnitt aus `src/data.js` wird verwendet. Die neuesten Karten zeigen die Rohwerte der ersten Quellenumfrage am letzten Befragungstag. Institutsangaben werden einschließlich gegebenenfalls enthaltener Auftraggeber übernommen.

Parteien werden in der Reihenfolge und den Farben des Archivs geführt, mit stabilen IDs `es-…`. Historische Spalten bleiben verfügbar, auch wenn die neueste Umfrage dort keine Werte enthält. Die Beschriftungen `Podemos / UP`, `AP / CD` und `Ciudadanos` verdeutlichen historische Bündnisse bzw. Abkürzungen. Parteien ohne eigene Spalte im nationalen Archiv sind nicht enthalten. Regionale spanische Umfragen und Zufriedenheitsdaten sind nicht angebunden.

Die Wahltermine im Archiv werden mit nationalen Ergebnissen aus [Elecciones 29N](https://generales29n.com/datos/) ergänzt: `https://datos.generales29n.com/v1/hist/congreso-YYYY-MM/es.json`. Die Quelle nennt das Ministerio del Interior und verlinkt dessen Originaldateien. Parteianteile werden aus den Stimmen durch die gültigen Stimmen einschließlich leerer Stimmzettel berechnet. Für Podemos / UP werden vor 2023 die zugehörigen nationalen und territorialen Bündniskandidaturen summiert. Sumar erhält erst ab 2023 eigene Wahlpunkte. AP/CD bleibt historisch von PP getrennt; das Kürzel PP vor 1989 bezeichnet in manchen Wahlunterlagen eine andere Partei und wird nicht dem heutigen Partido Popular zugeordnet. Die konkret summierten Kandidaturen stehen im Wahl-Tooltip. Ergebnisse fließen nicht in die Durchschnittswerte ein.

Der erste Spanien-Aufruf lädt Umfragen und vergangene Wahlergebnisse. Weitere Aktualisierungen laden die Umfragen erneut und behalten vorhandene historische Wahlpunkte; neu hinzugekommene Wahltermine werden nachgeladen. Bei Quellenfehlern bleibt der letzte vollständige Cache verfügbar. Für eine nachträgliche Korrektur historischer Wahldaten muss dieser Spanien-Cache neu aufgebaut werden. Die deutsche Standardansicht bleibt unabhängig davon verfügbar.

Der persistente Cache heißt `polls-es-congreso.json` und besitzt eine Importversion `spainPolicy`. Deutsche Cache-Dateinamen bleiben unverändert. Die spanischen Umfragetabellen stehen gemäß Quellenregister unter [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Bismuth, die Wikipedia-Autorinnen und -Autoren, die Lizenz und die eigene Durchschnittsberechnung werden unter dem Diagramm genannt; die Wahlquelle wird separat verlinkt.

## Lokal starten

Node.js 22 oder neuer, im Container Node.js 24. Keine npm-Abhängigkeiten und keine API-Schlüssel nötig.

```sh
npm test
npm start
```

Danach `http://localhost:3000`. Optional `PORT=3105 npm start`. `DATA_DIR` setzt das Cache-Verzeichnis, standardmäßig `./data`.

Dateien: `src/data.js` für deutschen Import und gemeinsame Berechnung, `src/regions.js` für deutsche Wahlgebiete und Blatt-IDs, `src/countries.js` für die Länderauswahl, `src/spain.js` für spanische Quellen und Wahlzuordnung, `src/server.js` für HTTP und Cache, `public/` für HTML, CSS und SVG-Diagramm. Die Frontend-Dateien werden direkt ausgeliefert; kein Build nötig.

## Demo und automatisches Deployment

GitHub Actions: `.github/workflows/deploy.yml`. **Jeder Push**, ohne Branch- oder Pfadfilter, sowie ein manueller `workflow_dispatch` startet die Tests und deployt den exakten Commit. Parallel eintreffende Runs werden serialisiert. Bei mehreren schnellen Pushes kann GitHub ältere wartende Runs ersetzen; der neueste Stand wird ausgerollt. Ein fehlgeschlagener Test verhindert das Deployment.

Repository-Secrets:

- `STAGING_SSH_KEY`: dedizierter privater Ed25519-Schlüssel für dieses Deployment.
- `STAGING_KNOWN_HOSTS`: bereits verifizierte SSH-Hostschlüssel für `207.180.217.99`.

Der öffentliche Schlüssel ist auf dem Demo-Server in `/root/.ssh/authorized_keys` mit `restrict` und dem festen Kommando `/usr/local/bin/politik-deploy` eingetragen. Er ermöglicht ausschließlich `deploy <Commit-SHA>`, keine interaktive Shell, Portweiterleitung oder freie Remote-Kommandos. Der private Schlüssel liegt ausschließlich als GitHub-Secret vor.

Serverlayout:

- Container: `politik-app`
- Infrastruktur: `/root/politik/compose.yaml`
- Installiertes Deployment-Skript: `/usr/local/bin/politik-deploy` (Quelle im Repository: `deployment/politik-deploy`)
- Releases: `/root/politik/releases/<Commit-SHA>`
- Aktive Revision: `/root/politik/.env`
- Images: `politik:<Commit-SHA>`
- Persistente Daten: Docker-Volume `politik_politik-data`
- Netzwerk: vorhandenes `traefik_network`

Das Deployment-Skript prüft den Archivinhalt, baut das Docker-Image, startet ausschließlich den Politik-Service und prüft Container-Gesundheit sowie den echten Datenimport. Bei einem Fehler nach dem Containerwechsel wird eine vorhandene Vorgängerversion wieder gestartet. GitHub prüft anschließend HTTPS, Datenbereitschaft und Commit-SHA unter `/healthz`. Der erste Rollout hat noch keine Vorgängerversion.

Traefik verwendet den vorhandenen HTTPS-Einstieg `websecure`, den Let's-Encrypt-Resolver `myresolver` und `security-headers@file`. Es werden keine Hostports geöffnet. Der App-Prozess läuft als Benutzer `node` mit schreibgeschütztem Root-Dateisystem, ohne Linux-Capabilities und mit 256 MB Speicherlimit. Nur das Datenvolume und `/tmp` sind beschreibbar. Die Demo sendet `noindex`.

Änderungen an `compose.yaml` oder am hostseitigen Deployment-Skript sind Infrastrukturänderungen und müssen separat auf dem Demo-Server installiert werden. Reguläre Pushes übertragen nur die Anwendung und den Dockerfile.

## Betrieb und Fehlerdiagnose

```sh
ssh root@staging
docker logs --tail 100 politik-app
docker inspect politik-app --format '{{.State.Health.Status}}'
cd /root/politik
docker compose ps
```

- `/healthz`: Prozessstatus und Datenbereitschaft der deutschen Bundesansicht, `version` (Commit-SHA), `dataReady`, `fetchedAt`.
- `/api/data` oder `/api/data?country=de&region=bundestag`: deutsche Bundesansicht. `/api/data?country=es` bzw. `/api/data?country=es&region=congreso` liefert Spanien. Mit `region=bayern`, `region=berlin` usw. wird die Länderansicht geladen; gültige IDs stehen in `src/regions.js`. Unbekannte Länder, Wahlgebiete oder Kombinationen liefern HTTP 400. Ohne `country` bleibt Deutschland der Standard, sodass bestehende URLs funktionieren. Die Antwort enthält das gewählte Land und Wahlgebiet alle Dropdown-Optionen sowie Parteien, neueste Einzelumfrage mit Institut und Rohwerten, tägliche Durchschnittswerte inklusive Umfragezahl, Wahlresultate, tägliche 7-Tage-Durchschnitte der Zufriedenheit inklusive Umfragezahl, Quellenlink und `stale`.
- Wenn CSV-Import scheitert: öffentliche Freigabe, Blatt-IDs, Überschriften, Datumsformat und Prozentformate der Quelle prüfen. Vorhandene Daten bleiben erhalten.
- Wenn der Spanien-Import scheitert: Erreichbarkeit, Schema und Qualitätsfreigabe des Bismuth-Endpunkts sowie die nationalen Wahlresultate von Elecciones 29N prüfen. Vorhandene Daten bleiben als `stale` erhalten; Deutschland nutzt seinen eigenen Cache.
- Wenn HTTPS scheitert: DNS-Ziel, Traefik-Router und Let's-Encrypt-Logs prüfen. TLS wird von Traefik bereitgestellt.
- Wenn GitHub „Permission denied“ meldet: die beiden Secrets und den eingeschränkten Eintrag in `authorized_keys` prüfen.
- Releases und Images werden für Rollback aufbewahrt; bei längerem Betrieb alte, nicht aktive Versionen nach Bedarf entfernen. Das Datenvolume nicht löschen.

Manueller Rollback auf eine bekannte vorhandene Revision:

```sh
cd /root/politik
APP_VERSION=<vorhandene-Commit-SHA> docker compose up -d --no-build --wait
printf 'APP_VERSION=%s\n' '<vorhandene-Commit-SHA>' > .env
```

Die App vergleicht verschiedene Institute und Frageformulierungen entsprechend den gelieferten Blättern. Zufriedenheitsdaten werden nicht methodisch vereinheitlicht. Unter dem Diagramm werden die Institute des gewählten Wahlgebiets aufgeführt. Die Bundesansicht berücksichtigt auch Institute der beiden Zufriedenheitsblätter. Groß-/Kleinschreibungsvarianten werden zusammengefasst, historische Namenszusätze bleiben erhalten.

Deutsche Parteifarben sind anhand der Quelltabelle übernommen; spätere Änderungen an deren Formatierung erfordern eine Anpassung der Farbkonstanten.
