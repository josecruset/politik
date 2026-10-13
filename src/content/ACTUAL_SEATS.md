# Reale Sitzverteilungen

Der dritte Eintrag bei „Berechnungsbasis“ zeigt belegte Mandate, keine aus Umfragen berechneten Sitze. Er umfasst Bundestag, alle 16 Landtage, Congreso, Katalonien und Barcelona. Grundlage ist `actual-seats.json`; Prüfung der Quellen: **13.10.2026**. Jeder Datensatz enthält Quellenlinks, Wahlperiode, Prüfdatum, Gruppen, Anzahlen und besondere Einschränkungen. Die Links stehen auch unmittelbar unter der Grafik.

Die Gruppierung folgt Fraktionen und parlamentarischen Gruppen, nicht automatisch der Parteizugehörigkeit einzelner Abgeordneter. Fraktionslose sind zur Darstellung zusammengefasst; sie bilden keine gemeinsame politische Fraktion. Auch Parteien ohne aktuellen Umfragewert bleiben enthalten. Die absolute rechnerische Mehrheit ist die Hälfte der Gesamtzahl plus ein Sitz. Der Halbkreis zeigt Anzahlen, keine verbindliche räumliche Sitzordnung. Gemeinsame Sitzsummen sagen nichts über Koalitionsbereitschaft aus.

## Quellenstand und Besonderheiten

| Gebiet | Sitze | Grundlage / Besonderheit |
| --- | ---: | --- |
| Bundestag | 630 | Amtlicher Sitzplan als JSON gezählt; AfD 150, Fraktionslose 3 einschließlich SSW. |
| Baden-Württemberg | 157 | Fraktionsübersicht und amtliches Volkshandbuch der 18. Wahlperiode; zusätzliche Mandate enthalten. |
| Bayern | 203 | Alle Seiten der aktuellen alphabetischen Mitgliederliste gezählt, Profile dedupliziert. |
| Berlin | 159 | Aktuelle Fraktionslisten der 19. Wahlperiode. Gültig bis 28.10.2026; Neukonstituierung am 29.10. |
| Brandenburg | 88 | Amtliche Plenarsitzordnung einschließlich Gruppe „Wir für Brandenburg“. |
| Bremen | 87 | Aktuelle Landtagsliste einschließlich Bremerhaven, BIW und Bürgerallianz; nicht die Stadtbürgerschaft. |
| Hamburg | 121 | Amtliche Übersicht mit Fraktionsanzahlen und einem Fraktionslosen. |
| Hessen | 133 | Aktuelle Fraktionslisten mit Mitgliederübersicht abgeglichen; drei Fraktionslose. |
| Mecklenburg-Vorpommern | 79 | Amtliche Fraktions-/Gruppenübersicht; FDP-Gruppe mit drei Mitgliedern. Gültig bis 19.10.2026, Neukonstituierung am 20.10. |
| Niedersachsen | 146 | Amtliche Plenarsitzordnung; Regierungsbank nicht zusätzlich gezählt. |
| Nordrhein-Westfalen | 195 | Aktueller amtlicher Sitzplan; Regierung und Präsidium nicht als zusätzliche Mandate gezählt. |
| Rheinland-Pfalz | 105 | Amtliche Statistik und Sitzplan vom 03.09.2026; zusätzliche Mandate enthalten. |
| Saarland | 51 | Auf Nutzerwunsch Wahlverteilung 2022: SPD 29, CDU 19, AfD 3. Wikipedia bestätigt diese Anzahlen. Aktuelle amtliche Mitgliederlisten zeigen dagegen 50 Personen (29/18/3); Grund ungeklärt. Abweichung und älterer Stand sichtbar, keine Behauptung einer vollständig bestätigten aktuellen Mitgliederliste. |
| Sachsen | 120 | Aktuelle alphabetische Mitgliederliste: BSW 14 und zwei Fraktionslose. Ältere Zusammenfassung mit nur einem Fraktionslosen nicht übernommen. |
| Sachsen-Anhalt | 83 | Aktuelle Mitgliederliste der bereits konstituierten 9. Wahlperiode. |
| Schleswig-Holstein | 69 | Amtliche Fraktions-/Gruppenübersicht einschließlich SSW. |
| Thüringen | 88 | Aktuelle Mitgliederlisten: Thüringen.Gerecht 10, Fraktionslose 5; veraltete Sitzplan-Bildbeschriftung der Vorperiode ignoriert. |
| Congreso | 350 | **Historisch:** am 06.10.2026 aufgelöst (BOE). Auf Nutzerwunsch letzte vollständige Verteilung vor Auflösung, belegt in EL PAÍS vom 01.10.2026. Amtlicher Congreso-Abruf blockiert; Zusammensetzungszahlen daher aus der datierten Pressequelle. Nicht die Diputación Permanente. Gültig bis 22.12.2026 vor angekündigter Neukonstituierung. |
| Katalonien | 135 | Aktuelle acht parlamentarische Gruppen; Mitgliedsprofile eindeutig gezählt. Grup Mixt: zwei Mandate von Aliança Catalana. |
| Barcelona | 41 | Offizielle kommunale Organisationsübersicht und Mitglieder-/Gruppenseite; keine Mandate für Unentschlossene oder andere Umfrage-Antwortgruppen. |

Die vollständigen URLs stehen in jedem JSON-Datensatz. Für bestehende Parteien werden die Farben der Umfrageansicht beibehalten; weitere Gruppen haben eigene Farben, Fraktionslose Grau.

## Aktualisierung

**Manuell versionierter Quellenstand.** Die 15-minütige Aktualisierung der Umfragen aktualisiert diese Sitzdaten nicht. Quellenstand und dieser Unterschied sind direkt bei der Grafik sichtbar. Nach mehr als 30 Tagen ohne erneute Prüfung erscheint zusätzlich ein Hinweis. Bekannte Termine für neue Wahlperioden sind als `validUntil` erfasst; danach wird eine Datenlücke gezeigt, statt die vorherige Zusammensetzung als aktuell auszugeben.

Bei Mandatswechseln, Fraktionswechseln, neuen Gruppen oder einer konstituierenden Sitzung:

1. Aktuelle amtliche Mitglieder-/Gruppenlisten prüfen. Original-Wahlergebnisse allein reichen nach Wechseln nicht aus. Regierungssitze, Präsidiumsplätze und doppelte Profilverweise nicht doppelt zählen.
2. `rows`, `total`, `legislature`, Quellen, Datumsfelder und Hinweise gemeinsam ändern. `checkedAt` ist das Prüfdatum; `asOf` kennzeichnet einen abweichenden belegten Stand. `qualification` steht sichtbar in der Basiszeile. `historical` darf nur mit Datum und Einschränkung gesetzt werden.
3. `validFrom`/`validUntil` anpassen und alle Summen prüfen; jeder Mandatsbestand wird vollständig dargestellt. Ungeklärte Abweichungen offen kennzeichnen, keine Mandate erfinden.
4. `npm test` ausführen und die reale Ansicht sowie beide Umfragemodi im Browser prüfen. Ein regulärer Commit/Push liefert das neue Quellenpaket aus.

`src/actual-seats.js` validiert Register, Wahlgebiet, Datumsfelder, Anzahlen, eindeutige Gruppen, Farben und HTTPS-Quellen beim Start. `currentSeats()` verwendet die Anzahlen unverändert; weder Sperrklausel noch Divisorverfahren oder Grundmandatsannahmen greifen in diesem Modus. Themen, Chronik und Umfragekurven bleiben unabhängig.
