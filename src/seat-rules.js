import { STATE_RULES } from './state-rules.js';
const official = (title, url) => ({ title, url });
const loreg = official('LOREG, Art. 162–163 und 180 (konsolidiert)', 'https://www.boe.es/buscar/act.php?id=BOE-A-1985-11672');
export function seatRule(country, region) {
  const checkedAt = '2026-10-12';
  if (country === 'de' && STATE_RULES[region]) return STATE_RULES[region];
  if (country === 'de' && region === 'bundestag') return {
    type: 'bundestag', seats: 630, threshold: 5, method: 'sainte-lague', majorityGuarantee: 'additional', checkedAt,
    title: 'Bundestag: bedingtes Listenmodell',
    assumptions: 'Regulär 630 Sitze nach Sainte-Laguë/Schepers; die gesetzliche Mehrheitsgarantie kann zusätzliche Sitze erzeugen. Nur ausgewiesene Parteien ab 5 % nehmen teil. Union wird als gemeinsame Modellliste behandelt. Nicht einzeln erhobene Parteien, Minderheitenparteien (etwa SSW), unabhängige Wahlkreissieger und die Verteilung auf Landeslisten fehlen. Unter 5 % kannst Du den Gewinn von mindestens drei Wahlkreisen als Annahme setzen. Ohne diese Annahme bleibt die Partei ausgeschlossen. Keine amtliche Prognose; Umfrageunsicherheit wird nicht in Sitzintervalle übersetzt.',
    sources: [official('Bundeswahlleiterin: Wahlsystem und Ausnahmen', 'https://www.bundeswahlleiterin.de/bundestagswahlen/2025/informationen-waehler/wahlsystem.html'), official('Grundmandatsklausel', 'https://www.bundeswahlleiterin.de/service/glossar/g/grundmandatsklausel.html'), official('BWahlG § 4, einschließlich Mehrheitsgarantie', 'https://www.gesetze-im-internet.de/bwahlg/__4.html')],
  };
  if (country === 'es' && region === 'katalonien') return {
    type: 'catalonia', seats: 135, threshold: 3, method: 'dhondt', districts: [85, 17, 15, 18], checkedAt,
    title: 'Katalonien: Modell mit gleicher Stimmenverteilung in allen Provinzen',
    assumptions: 'D’Hondt in Barcelona (85), Girona (17), Lleida (15) und Tarragona (18 Sitze), jeweils 3 % Sperrklausel. Mangels Provinzumfragen erhält jede Provinz dieselben Parteianteile. Nicht ausgewiesene Kandidaturen und leere Stimmen werden nicht geschätzt. Diese starke Annahme kann Regionalparteien und Mehrheiten deutlich verzerren. Prozentintervalle verwenden den bereits dokumentierten Mittelpunkt. Keine gesetzliche Wahlprognose und keine Unsicherheitsintervalle.',
    sources: [official('Parlament: Wahlverfahren und Provinzsitze', 'https://www.parlament.cat/pcat/parlament/que-es-el-parlament/procediment-electoral/'), loreg],
  };
  if (country === 'es' && region === 'barcelona') return {
    type: 'barcelona', seats: 41, threshold: 5, method: 'dhondt', checkedAt,
    title: 'Barcelona: hypothetisches Szenario der entschiedenen Befragten',
    assumptions: '41 Gemeinderatssitze nach D’Hondt; 5 % der gültigen Stimmen. Für dieses Szenario nehmen ausschließlich Befragte mit Parteientscheidung sowie Leer/ungültig und Andere Parteien teil. Unentschlossene/keine Antwort und Nichtwähler erhalten keine Sitze. Ihre spätere Entscheidung wird nicht vorhergesagt. Die gemeinsam erhobenen leeren/ungültigen Stimmen werden konservativ vollständig als gültige leere Stimmen im Nenner behandelt. Andere Parteien erhalten keine Sitze, solange selbst ihre Gesamtsumme unter 5 % bleibt; sonst werden keine Sitze berechnet. Die Parteigrafik behält ihre Originalbezugsgröße. Keine Wahlschätzung.',
    sources: [loreg, official('Ajuntament: 41 Gemeinderatsmitglieder', 'https://ajuntament.barcelona.cat/organitzacio-municipal/estructura-executiva')],
  };
  if (country === 'es') return { type: 'gap', title: 'Congreso: fehlende Provinzdaten', checkedAt, reason: '350 Sitze werden auf 50 Provinzen sowie Ceuta und Melilla verteilt. D’Hondt und die 3-%-Hürde gelten je Provinz, die beiden Städte wählen je einen Abgeordneten. Das nationale Archiv enthält keine vollständigen Provinzanteile und mehrere Regionalparteien fehlen. Eine landesweite Umrechnung würde diese Sitze falsch verteilen. Deshalb keine Sitzzahlen oder rechnerischen Mehrheiten.', sources: [loreg] };
  return { type: 'gap', title: 'Landeswahl: Daten und Landesmodell fehlen', checkedAt, reason: 'Die Landesumfrage allein enthält keine Wahlkreis- und Direktmandatsprognosen oder weitere für das jeweilige Landeswahlrecht erforderliche regionale Stimmen. Überhang, Ausgleich, Sperrklauselausnahmen und in manchen Ländern getrennte Wahlbereiche bzw. mehrere Stimmen lassen sich daraus nicht zuverlässig ableiten. Für dieses Land ist noch kein geprüftes Näherungsmodell hinterlegt. Deshalb keine Sitzzahlen oder Mehrheiten.', sources: [official('Bundeswahlleiterin: Landeswahlrecht und zuständige Landeswahlleitungen', 'https://www.bundeswahlleiterin.de/service/landtagswahlen.html')] };
}
