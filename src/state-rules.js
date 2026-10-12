// Research date is a review date, not a promise that legislation never changes.
// These are expressly labelled regular-seat models, not complete election counts.
const checkedAt = '2026-10-12';
const baseAssumptions = [
  'Modell auf Basis der regulären Sitzzahl. Überhang- und Ausgleichsmandate sowie die tatsächlich zu erwartende Parlamentsgröße werden nicht berechnet.',
  'Die Umfrageanteile werden als Anteile der für die Sitzverteilung maßgeblichen gültigen Parteistimmen verwendet. Nicht ausgewiesene Parteien und unabhängige Wahlkreisgewinner können das Ergebnis verändern.',
  'Direktmandate, Personenstimmen, erschöpfte Listen und die interne Listenbesetzung werden nicht prognostiziert. Gerundete Umfragewerte sind keine exakten Stimmenzahlen; kleine Änderungen nahe 5 % oder an einem Rundungsrest können Sitze und Mehrheiten ändern.',
];

function state(title, seats, method, sources, extra = {}) {
  const { assumptions = [], ...options } = extra;
  return { type: 'state', title, seats, threshold: 5, method, checkedAt, ...options, assumptions: [...baseAssumptions, ...assumptions], sources };
}

export const STATE_RULES = {
  'baden-wuerttemberg': state('Baden-Württemberg: Modell der 120 regulären Sitze', 120, 'sainte-lague', [
    { title: 'Innenministerium Baden-Württemberg: Landtagswahl 2026 und Sitzverteilung', url: 'https://im.baden-wuerttemberg.de/de/land-kommunen/lebendige-demokratie/wahlen/landtagswahl-2026' },
    { title: 'Landtag Baden-Württemberg: Wahlsystem', url: 'https://www.landtag-bw.de/de/der-landtag/parlament/das-baden-wuerttembergische-wahlsystem' },
  ], { assumptions: ['Das seit der Wahl 2026 geltende Zweistimmensystem und die landesweite Zweitstimmenverteilung werden verwendet. Frühere Umfragen werden nicht nach dem früheren Einstimmensystem zurückgerechnet. Ein Direktmandat hebt die Sperrklausel für die proportionale Parteiverteilung nicht auf.'] }),

  bayern: state('Bayern: Modell der 180 regulären Sitze', 180, 'sainte-lague', [
    { title: 'Bayerisches Landeswahlgesetz, Art. 21 und 42', url: 'https://www.gesetze-bayern.de/Content/Document/BayLWG/true' },
    { title: 'Bayerisches Landesamt für Statistik: Landtagswahlen von A bis Z', url: 'https://www.statistik.bayern.de/wahlen/landtagswahlen/wahlen_a-z/' },
  ], {
    districts: [
      { id: 'oberbayern', label: 'Oberbayern', seats: 61 },
      { id: 'niederbayern', label: 'Niederbayern', seats: 18 },
      { id: 'oberpfalz', label: 'Oberpfalz', seats: 16 },
      { id: 'oberfranken', label: 'Oberfranken', seats: 16 },
      { id: 'mittelfranken', label: 'Mittelfranken', seats: 24 },
      { id: 'unterfranken', label: 'Unterfranken', seats: 19 },
      { id: 'schwaben', label: 'Schwaben', seats: 26 },
    ],
    assumptions: ['Mangels regionaler Umfragen wird in allen sieben Wahlkreisen derselbe Landesanteil angenommen und dort getrennt gerundet. Das ist eine Annahme, keine gemessene Regionalverteilung.', 'Die Umfrage wird als Näherung für Gesamtstimmen (Erst- plus Zweitstimmen) behandelt. Die 5%-Hürde gilt landesweit auch für direkt gewonnene Stimmkreise; es gibt keine Grundmandatsbefreiung.', 'Die regionalen Sitzkontingente 61/18/16/16/24/19/26 entsprechen der amtlichen regulären Basis 2023. Eine spätere Bevölkerungsneuverteilung für die nächste Wahl kann sie ändern.'],
  }),

  berlin: state('Berlin: Modell der 130 regulären Sitze', 130, 'hare', [
    { title: 'Landeswahlleitung Berlin: Sitzverteilung im Abgeordnetenhaus und Bundestag', url: 'https://www.berlin.de/wahlen/organisation/landeswahlleitung/information---sitzverteilung-agh-und-bt.pdf?ts=1767783957' },
    { title: 'Landeszentrale für politische Bildung Berlin: Abgeordnetenhauswahl 2026', url: 'https://www.berlin.de/politische-bildung/berlinwahlen-2026/abgeordnetenhauswahl/artikel.1664704.php' },
  ], { directException: 1, assumptions: ['Die 5%-Hürde entfällt für eine Partei mit mindestens einem Direktmandat. Das Erreichen dieses Mandats wird nicht aus der Sonntagsfrage abgeleitet; eine entsprechende Auswahl ist ausdrücklich Deine zusätzliche Annahme. Bezirkslisten und Überhang-/Ausgleichseffekte werden nicht berechnet.'] }),

  brandenburg: state('Brandenburg: Modell der 88 regulären Sitze', 88, 'hare', [
    { title: 'Brandenburgisches Landeswahlgesetz, insbesondere § 3', url: 'https://bravors.brandenburg.de/gesetze/bbglwahlg' },
    { title: 'Landeswahlleitung Brandenburg: Wahlsystem', url: 'https://wahlen.brandenburg.de/wahlen/de/landtagswahl/wahlystem/' },
  ], { directException: 1, majorityGuarantee: true, minorityException: 'sorben', assumptions: ['Eine Partei mit mindestens einem Direktmandat nimmt auch unter 5 % an der proportionalen Verteilung teil. Das Mandat ist eine zusätzliche Annahme, keine Prognose.', 'Landeslisten der Sorben/Wenden sind von der Sperrklausel befreit. Unter den vorhandenen Umfrageparteien ist keine solche Liste identifiziert; insbesondere BVB/Freie Wähler wird nicht automatisch als sorbische Liste behandelt.', 'Die gesetzliche Mehrheitsklausel für mehr als die Hälfte der berücksichtigten Listenstimmen wird angewandt.'] }),

  bremen: state('Bremen: Modell der 87 regulären Sitze', 87, 'sainte-lague', [
    { title: 'Landeswahlleitung Bremen: Landtags- und Kommunalwahlen, 72 und 15 Sitze', url: 'https://www.wahlen.bremen.de/bremer-wahlen-6925' },
    { title: 'Landeswahlleitung Bremen: Bürgerschaft und getrennte 5%-Hürden', url: 'https://www.wahlen.bremen.de/wissenswertes/wahl-abc/buergerschaft-7444' },
    { title: 'Freie Hansestadt Bremen: Wahl der Bürgerschaft mit fünf Stimmen', url: 'https://landesportal.bremen.de/die-wahl-der-buergerschaft' },
  ], {
    districts: [{ id: 'bremen', label: 'Bremen', seats: 72 }, { id: 'bremerhaven', label: 'Bremerhaven', seats: 15 }],
    assumptions: ['Die beiden Wahlbereiche werden getrennt gerechnet. Mangels getrennter Umfragedaten wird in Bremen und Bremerhaven derselbe landesweite Stimmenanteil angenommen.', 'Die 5%-Hürde gilt in jedem Wahlbereich gesondert. Eine landesweit unter 5 % liegende Partei kann tatsächlich in nur einem Wahlbereich Sitze gewinnen; dieser regionale Effekt fehlt in der Annahme gleicher Anteile.', 'Das Modell behandelt die Sonntagsfrage als Anteil an den Gesamtstimmen für einen Wahlvorschlag. Die Aufteilung der fünf Stimmen auf Listen und einzelne Personen wird nicht modelliert.'],
  }),

  hamburg: state('Hamburg: Modell der 121 regulären Sitze', 121, 'sainte-lague', [
    { title: 'Hamburgische Bürgerschaft: Wahlrecht und Sitzverteilungsverfahren', url: 'https://www.hamburgische-buergerschaft.de/beteiligung/wahlrecht' },
    { title: 'Freie und Hansestadt Hamburg: Hinweise für Parteien und Wahlsystem', url: 'https://www.hamburg.de/politik-und-verwaltung/behoerden/behoerde-fuer-inneres-und-sport/themen/wahlen/hinweise-fuer-parteien-waehlervereinigungen-und-einzelbewerbende-884886' },
    { title: 'Hamburgisches Justizministerialblatt 3/2023, Erläuterung des § 5 BüWG', url: 'https://www.hamburg.de/resource/blob/215890/9044915e68d61dd4118142bf0765b10f/hmbjvbl-2023-03-data.pdf' },
  ], { assumptions: ['Die Landeslisten-Gesamtstimmen bestimmen die proportionale Parteiverteilung. Das Modell prognostiziert nicht die Personen- und Wahlkreislistenstimmen.', 'Wahlkreissitze einer Partei unter 5 % werden gesetzlich gesondert behandelt; ein solcher Sitz befreit deren gesamte Landesliste nicht von der Sperrklausel. Ohne Wahlkreisdaten werden solche zusätzlichen Sitze nicht angesetzt.'] }),

  hessen: state('Hessen: Modell der 110 regulären Sitze', 110, 'hare', [
    { title: 'Landeswahlleitung Hessen: Wahlsystem und Rechtsgrundlagen', url: 'https://wahlen.hessen.de/landtagswahlen/wahlsystem-und-rechtsgrundlagen' },
  ], { assumptions: ['Maßgeblich sind die landesweit gültigen Landesstimmen. Gewonnene Direktmandate unter 5 % erlauben keine proportionale Beteiligung der gesamten Landesliste.'] }),

  'mecklenburg-vorpommern': state('Mecklenburg-Vorpommern: Modell der 71 regulären Sitze', 71, 'hare', [
    { title: 'Landtag Mecklenburg-Vorpommern: Landtagswahlen, Wissen kompakt', url: 'https://www.landtag-mv.de/landtag/rund-um-wahlen/wissen-kompakt' },
    { title: 'Landtag Mecklenburg-Vorpommern: Rechtsgrundlagen, § 58 Absatz 4 LKWG M-V', url: 'https://www.landtag-mv.de/fileadmin/Publikationen/Publikationen_Archiv/Rechtsgrundlagen_Stand-Januar_2020_web.pdf' },
    { title: 'Landeswahlleitung Mecklenburg-Vorpommern: aktuelle Rechtsvorschriften', url: 'https://www.laiv-mv.de/Wahlen/Rechtsvorschriften/' },
  ], { majorityGuarantee: true, assumptions: ['Maßgeblich sind die Zweitstimmen. Eine Grundmandatsbefreiung der Landesliste wird nicht angesetzt; unabhängige oder unter der Sperrklausel liegende Wahlkreisgewinner können ohne regionale Daten nicht berücksichtigt werden.', 'Die Mehrheitsklausel für mehr als die Hälfte der berücksichtigten Zweitstimmen wird angewandt.'] }),

  niedersachsen: state('Niedersachsen: Modell der 135 regulären Sitze für die nächste Wahl', 135, 'sainte-lague', [
    { title: 'Niedersächsisches Innenministerium: Wahlrechtsreform vom 3. März 2026', url: 'https://www.mi.niedersachsen.de/startseite/aktuelles/presseinformationen/abstimmung-im-landtag-niedersachsen-stellt-wahlkreise-fur-die-landtagswahl-2027-verfassungskonform-neu-auf-249144.html' },
    { title: 'Niedersächsischer Landtag: Wahlverfahren und reguläre Sitzzahl', url: 'https://www.landtag-niedersachsen.de/landtagswahlen/wahlverfahren-wahlsystem/' },
  ], { assumptions: ['Für die nächste Wahl 2027 gilt nach der im März 2026 beschlossenen Reform Sainte-Laguë/Schepers. Die Wahl 2022 wurde noch nach d’Hondt gerechnet; alte Umfragen werden hier mit dem Modell der nächsten Wahl gerechnet. Eine Grundmandatsbefreiung wird nicht angesetzt.'] }),

  'nordrhein-westfalen': state('Nordrhein-Westfalen: Modell der 181 regulären Sitze', 181, 'sainte-lague', [
    { title: 'Amtliches Landeswahlgesetz Nordrhein-Westfalen, Fassung 19. Februar 2026', url: 'https://recht.nrw.de/lrgv/gesetz/19022026-gesetz-ueber-die-wahl-zum-landtag-des-landes-nordrhein-westfalen/' },
    { title: 'Stadt Essen, Wahlamt: Landtagswahl 2027, § 33 LWahlG und Sitzverfahren', url: 'https://www.essen.de/rathaus/wahlen_und_abstimmungen/wahlen/landtagswahlen/landtagswahlen.de.html' },
  ], { assumptions: ['Landesweit gültige Zweitstimmen sind maßgeblich. Ein Wahlkreisgewinn hebt die 5%-Hürde der Landesliste nicht auf; solche gesonderten Wahlkreissitze fehlen mangels Daten.'] }),

  'rheinland-pfalz': state('Rheinland-Pfalz: Modell der 101 regulären Sitze', 101, 'sainte-lague', [
    { title: 'Landeswahlleiter Rheinland-Pfalz: Landtagswahl 2026 – So wird gewählt', url: 'https://www.wahlen.rlp.de/landtagswahl/fuer-wahlberechtigte-und-parteien/so-wird-gewaehlt' },
    { title: 'Landeswahlleiter Rheinland-Pfalz: ABC des Wahlrechts, Sitzverteilung', url: 'https://www.wahlen.rlp.de/service/abc-des-wahlrechts' },
  ], { assumptions: ['Die Landesstimmen bestimmen die Parteigesamtsitze. Landes-/Bezirkslistenbesetzung und direkt gewonnene Sitze außerhalb der proportional berücksichtigten Parteien werden nicht prognostiziert. Keine Grundmandatsbefreiung wird angenommen.'] }),

  saarland: state('Saarland: Modell der 51 regulären Sitze', 51, 'dhondt', [
    { title: 'Landtag des Saarlandes: Landtagswahlgesetz, §§ 1 und 38', url: 'https://www.landtag-saar.de/media/1183/landtagswahlgesetz.pdf' },
  ], { assumptions: ['Die 51 Parteigesamtsitze werden zuerst landesweit nach d’Hondt vergeben. Die anschließende Verteilung von 41 Sitzen auf die drei Kreislisten und des Rests auf Landeslisten betrifft die Listenbesetzung; sie wird hier nicht simuliert.', 'Deshalb benötigt dieses Modell der Parteigesamtsitze keine erfundenen regionalen Stimmenanteile oder festen Sitzkontingente der drei Wahlkreise.'] }),

  sachsen: state('Sachsen: Modell der 120 regulären Sitze', 120, 'sainte-lague', [
    { title: 'Sächsischer Landtag: Wahlverfahren und § 6 SächsWahlG', url: 'https://www.landtag.sachsen.de/de/mitgestalten/wahlen/wahlverfahren-9125.cshtml' },
  ], { directException: 2, assumptions: ['Die seit 2023 geltende Sainte-Laguë-Regel wird verwendet, nicht das frühere d’Hondt-Verfahren.', 'Für eine proportionale Beteiligung unter 5 % sind mindestens zwei Direktmandate erforderlich. Ein einzelner Direktgewinn kann einen einzelnen Sitz sichern, befreit aber nicht die ganze Landesliste. Solche einzelnen Sitze werden ohne Wahlkreisdaten nicht angesetzt. Eine Auswahl der Grundmandatsausnahme ist eine zusätzliche Annahme.'] }),

  'sachsen-anhalt': state('Sachsen-Anhalt: Modell der 83 regulären Sitze', 83, 'hare', [
    { title: 'Landtag Sachsen-Anhalt: Wahlgesetz, Fassung vom März 2026, insbesondere § 35', url: 'https://www.landtag.sachsen-anhalt.de/fileadmin/Downloads/Rechtsgrundlagen/Gesetze_8.WP/20260310_Wahlgesetz_LWG.pdf' },
    { title: 'Landeswahlleitung Sachsen-Anhalt: FAQ zur Landtagswahl 2026', url: 'https://wahlen.sachsen-anhalt.de/zu-den-wahlen/landtagswahl/faq-zur-landtagswahl-2026' },
  ], { majorityGuarantee: 'all', assumptions: ['Die gesetzliche Mehrheitsklausel setzt mehr als die Hälfte aller gültigen Zweitstimmen voraus, nicht nur der an der Verteilung beteiligten Parteien. Eine Grundmandatsbefreiung der Landesliste gibt es nicht.'] }),

  'schleswig-holstein': state('Schleswig-Holstein: Modell der 69 regulären Sitze', 69, 'sainte-lague', [
    { title: 'Landeswahlleiter Schleswig-Holstein: Wahlsystem, Sperrklausel und SSW', url: 'https://www.schleswig-holstein.de/DE/landesregierung/themen/demokratie-gesellschaft/wahlen/Presse/PI/2022/220428_PI_LT_Wahl.pdf?__blob=publicationFile&v=1' },
  ], { directException: 1, exceptions: ['ssw'], assumptions: ['Die 5%-Hürde entfällt für Parteien der dänischen Minderheit; unter den vorhandenen Umfrageparteien trifft dies auf den SSW zu.', 'Auch mindestens ein Direktmandat ermöglicht die Teilnahme am proportionalen Ausgleich unter 5 %. Dieser Wahlkreisgewinn kann nur zusätzlich angenommen werden und wird nicht aus der Landesumfrage abgeleitet.'] }),

  thueringen: state('Thüringen: Modell der 88 regulären Sitze', 88, 'hare', [
    { title: 'Thüringer Landeswahlleiter: Wahlrecht, insbesondere § 5 ThürLWG', url: 'https://wahlen.thueringen.de/landtagswahlen/gesetze/Landeswahlgesetz.pdf' },
    { title: 'Thüringer Landtag: FAQ Wahlen', url: 'https://www.thueringer-landtag.de/mitgestalten/wahlen/faq-wahlen/' },
  ], { majorityGuarantee: true, assumptions: ['Die gesetzliche Mehrheitsklausel für mehr als die Hälfte der berücksichtigten Landeslistenstimmen wird angewandt. Keine Grundmandatsbefreiung für die Landesliste wird angesetzt.'] }),
};
