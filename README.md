# Politik

Wie verändert sich die politische Stimmung in Deutschland? **Politik** zeigt die Umfragewerte der Parteien im Zeitverlauf – für die Bundestagswahl und für alle 16 Bundesländer. In der Bundesansicht kannst du außerdem verfolgen, wie zufrieden die Befragten mit der Bundesregierung und dem Bundeskanzler sind.

**[Demo öffnen: politik.cruset.com](https://politik.cruset.com)**

## Die Anwendung nutzen

Wähle über dem Diagramm **Bundestagswahl** oder ein Bundesland aus. Die Bundesansicht zeigt AfD, Union, SPD, Grüne, Linke, BSW und FDP. In den Länderansichten werden CDU bzw. CSU korrekt benannt und zusätzliche Landesparteien angezeigt, soweit die Quelle eigene Werte für sie enthält.

Die Karten über dem Diagramm zeigen die **gemeldeten Werte der neuesten Einzelumfrage**, ohne Durchschnitt. Bei „Letzte Umfrage“ stehen das Datum und das Umfrageinstitut. Ein Strich (–) bedeutet, dass für eine Partei kein Wert in dieser Umfrage vorliegt.

Klicke auf eine Parteienkarte, um ihre Linie aus- oder wieder einzublenden. Zu Beginn sind alle Parteien eingeschaltet. In der Bundesansicht gibt es zusätzlich zwei Schalter für **Zufriedenheit Regierung** und **Zufriedenheit Bundeskanzler**. Diese sind zunächst ausgeschaltet und werden in Länderansichten nicht angeboten.

Das Diagramm startet beim neuesten Zeitraum und zeigt ungefähr **zwölf Monate auf einmal**. Scrolle horizontal, um frühere Entwicklungen zu sehen. Du kannst die Zeitachse auch per Touch oder mit den Pfeiltasten bedienen, wenn das Diagramm den Fokus hat. Bewege den Mauszeiger über das Diagramm oder tippe darauf, um die Werte für einen Tag zu sehen.

Die Prozentachse beginnt bei null und passt sich automatisch an die sichtbaren, eingeschalteten Kurven und Wahlpunkte an. So bleiben Unterschiede auch bei niedrigeren Werten gut erkennbar. Die dünne schwarze Linie markiert **5 %**. Wahlergebnisse erscheinen als größere Punkte; ihr Tooltip nennt die jeweilige Wahl. In Länderansichten werden nur Ergebnisse der jeweiligen Landeswahl markiert.

## Was die Linien zeigen

Alle Kurven zeigen einen **gleitenden 7-Tage-Durchschnitt**: Für jeden Tag werden die Umfragen dieses Tages und der sechs vorherigen Kalendertage zusammengefasst. Jede Umfrage zählt gleich viel. Fehlende Werte werden ausgelassen; Wahlergebnisse, Wahlabend-Prognosen und Hochrechnungen fließen nicht in den Durchschnitt ein.

Das gilt auch für die beiden Zufriedenheitskurven. Dafür werden zunächst die beiden positiven Antwortanteile der jeweiligen Umfrage addiert und anschließend über sieben Tage gemittelt.

Die Linien verbinden vorhandene Durchschnittswerte auch über Umfragepausen hinweg. Für Tage ohne Messwerte im 7-Tage-Fenster wird im Tooltip kein Wert angezeigt. Die Parteikarten und die Kurven können unterschiedliche Werte zeigen: Die Karten geben die letzte Einzelumfrage wieder, die Kurven den Durchschnitt mehrerer Umfragen.

## Datenquelle und Aktualisierung

Die Daten stammen aus der öffentlichen Google-Tabelle [Deutschland Wählt – Umfragen-Verlauf](https://docs.google.com/spreadsheets/d/1aT2f8yc8p9-XjOqFCTQ1nDeP5GEORu9QZDOtUwF8smI/htmlview). Unter dem Diagramm findest du die beteiligten Umfrageinstitute und einen Link zur Originaltabelle.

Die Anwendung ruft die Daten **alle 15 Minuten** ab; der letzte Abruf steht unten auf der Seite. Das Datum der neuesten Umfrage hängt davon ab, wann die Quelle neue Ergebnisse veröffentlicht. Schlägt eine Aktualisierung fehl, bleiben bereits verfügbare Daten sichtbar und werden entsprechend gekennzeichnet.

Die Darstellung fasst verschiedene Institute und Frageformulierungen zusammen. Sie hilft, Entwicklungen zu vergleichen; sie ist keine Wahlprognose.

## Autor und Technik

Entwickelt von **[José Cruset](https://x.com/josecruset)**. Den Quellcode findest du im [GitHub-Repo](https://github.com/josecruset/politik).

Informationen zu Installation, Datenimport, genauen Berechnungsregeln, automatischem Deployment und Betrieb stehen in der **[technischen Dokumentation](TECHNIK.md)**.
