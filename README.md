# Politik

Wie verändert sich die politische Stimmung in Deutschland und Spanien? **Politik** zeigt die Umfragewerte der Parteien im Zeitverlauf. Für Deutschland stehen die Bundestagswahl und alle 16 Bundesländer zur Verfügung, für Spanien zunächst die nationale Parlamentswahl (Congreso). In der deutschen Bundesansicht kannst Du außerdem verfolgen, wie zufrieden die Befragten mit der Bundesregierung und dem Bundeskanzler sind.

**[Demo öffnen: politik.cruset.com](https://politik.cruset.com)**

## Die Anwendung nutzen

Über den **Dark-Mode-Schalter oben** kannst Du zwischen heller und dunkler Darstellung wechseln. Deine Auswahl bleibt im Browser gespeichert. Ohne eigene Auswahl richtet sich die Darstellung nach Deinem System.

Wähle rechts oben zwischen **Deutschland** und **Spanien**. Beim Wechsel bleiben Deine ausgewählten Parteien, das Wahlgebiet und der betrachtete Zeitraum je Ansicht erhalten. Für Deutschland wählst Du über dem Diagramm **Bundestagswahl** oder ein Bundesland aus. Die Bundesansicht zeigt AfD, Union, SPD, Grüne, Linke, BSW und FDP. In den Länderansichten werden CDU bzw. CSU korrekt benannt und zusätzliche Landesparteien angezeigt, soweit die Quelle eigene Werte für sie enthält.

Für Spanien zeigt die Anwendung die in der Quelle enthaltenen nationalen Parteien, darunter PP, PSOE, Vox, Sumar, Podemos / UP und Ciudadanos sowie historische Parteien wie UCD und AP / CD. Spanische Regionalumfragen und Zufriedenheitskurven werden zunächst nicht angeboten. Historische Bündnisse bleiben unter den Bezeichnungen der Quelle erkennbar.

Die Karten über dem Diagramm zeigen die **gemeldeten Werte der neuesten Einzelumfrage**, ohne Durchschnitt. Bei „Letzte Umfrage“ stehen das Datum und das Umfrageinstitut. Ein Strich (–) bedeutet, dass für eine Partei kein Wert in dieser Umfrage vorliegt.

Klicke auf eine Parteienkarte, um ihre Linie aus- oder wieder einzublenden. Zu Beginn sind alle Parteien eingeschaltet. In der deutschen Bundesansicht gibt es zusätzlich zwei Schalter für **Zufriedenheit Regierung** und **Zufriedenheit Bundeskanzler**. Diese sind zunächst ausgeschaltet und werden in Bundesländeransichten nicht angeboten.

Das Diagramm startet beim neuesten Zeitraum und zeigt ungefähr **zwölf Monate auf einmal**. Scrolle horizontal, um frühere Entwicklungen zu sehen. Du kannst die Zeitachse auch per Touch oder mit den Pfeiltasten bedienen, wenn das Diagramm den Fokus hat. Bewege den Mauszeiger über das Diagramm oder tippe darauf, um die Werte für einen Tag zu sehen.

Die Prozentachse beginnt bei null und passt sich automatisch an die sichtbaren, eingeschalteten Kurven und Wahlpunkte an. So bleiben Unterschiede auch bei niedrigeren Werten gut erkennbar. Wahlergebnisse erscheinen als größere Punkte; ihr Tooltip nennt die jeweilige Wahl. In Länderansichten werden nur Ergebnisse der jeweiligen Landeswahl markiert.

## Was die Linien zeigen

Alle Kurven zeigen einen **gleitenden 7-Tage-Durchschnitt**: Für jeden Tag werden die Umfragen dieses Tages und der sechs vorherigen Kalendertage zusammengefasst. Jede Umfrage zählt gleich viel. Fehlende Werte werden ausgelassen; Wahlergebnisse, Wahlabend-Prognosen und Hochrechnungen fließen nicht in den Durchschnitt ein.

Das gilt auch für die beiden Zufriedenheitskurven. Dafür werden zunächst die beiden positiven Antwortanteile der jeweiligen Umfrage addiert und anschließend über sieben Tage gemittelt.

Die Linien verbinden vorhandene Durchschnittswerte auch über Umfragepausen hinweg. Für Tage ohne Messwerte im 7-Tage-Fenster wird im Tooltip kein Wert angezeigt. Die Parteikarten und die Kurven können unterschiedliche Werte zeigen: Die Karten geben die letzte Einzelumfrage wieder, die Kurven den Durchschnitt mehrerer Umfragen.

## Datenquelle und Aktualisierung

Die deutschen Daten stammen aus der öffentlichen Google-Tabelle [Deutschland Wählt – Umfragen-Verlauf](https://docs.google.com/spreadsheets/d/1aT2f8yc8p9-XjOqFCTQ1nDeP5GEORu9QZDOtUwF8smI/htmlview). Die spanischen Umfragen stammen aus dem [Bismuth-Media-Archiv](https://bismuthmedia.net/country/spain), das öffentliche Wikipedia-Umfragetabellen aufbereitet. Die Zeitachse und „Letzte Umfrage“ verwenden für Spanien das **Ende des Befragungszeitraums**. Die Kurven werden aus den Einzelumfragen neu berechnet. Spanische Wahlpunkte verwenden Ergebnisse des Ministerio del Interior über [Elecciones 29N](https://generales29n.com/datos-historicos/). Unter dem Diagramm findest Du die beteiligten Umfrageinstitute, die Quellen und deren Lizenzhinweise.

Die Anwendung ruft die Daten **alle 15 Minuten** ab; der letzte Abruf steht unten auf der Seite. Das Datum der neuesten Umfrage hängt davon ab, wann die Quelle neue Ergebnisse veröffentlicht. Schlägt eine Aktualisierung fehl, bleiben bereits verfügbare Daten sichtbar und werden entsprechend gekennzeichnet.

Die Darstellung fasst verschiedene Institute und Frageformulierungen zusammen. Sie hilft, Entwicklungen zu vergleichen; sie ist keine Wahlprognose.

## Autor und Technik

Entwickelt von **[José Cruset](https://x.com/josecruset)**. Den Quellcode findest Du im [GitHub-Repo](https://github.com/josecruset/politik).

Informationen zu Installation, Datenimport, genauen Berechnungsregeln, automatischem Deployment und Betrieb stehen in der **[technischen Dokumentation](TECHNIK.md)**.
