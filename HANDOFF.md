# Übergabe – Arbeit in Hazeberry/codex (Stand 06.11.2026)

## Bughunts: offene Prüfaufträge (07.11.2026)

Quelle: von Hazeberry übermittelte Review-Berichte. Terra führte den ersten Bughunt in
`index.html` durch, Astra den zweiten. Die Autorenzuordnung des separaten GTP-Reviews
ist nicht festgehalten. Die Reviews bezogen sich laut Bericht auf den jeweiligen
Default-Branch; Repository und genauer Commit wurden in den übermittelten Texten
nicht genannt. Vor Untersuchung daher Befund am gewählten Quellenstand erneut prüfen.
Die folgenden Punkte sind keine in dieser Übergabe unabhängig bestätigten Fehler
und kein Nachweis einer allgemeinen Spielstärke-Regression.

### GTP-Adapter: gtp-ki.js

| ID | Priorität laut Review | Befund / Prüfauftrag | Reproduktion und erwartetes Verhalten |
|---|---|---|---|
| GTP-1 | P1 | `play` prüft besetzte Punkte, soll aber Suizid sowie Ko-/Superko-Rückschläge annehmen und so den Brettzustand verfälschen. | Suizid und Ko/Superko gemäß den implementierten Regeln einzeln prüfen. Bei Ablehnung müssen Brett, Gefangene, Ko, Historie und Zugzustand unverändert bleiben. |
| GTP-2 | P2 | `genmove` ruft `getAIMove` ohne den Kontext `extra.gegnerPasste` auf; die eingeschaltete Versuchs-Passregel könne deshalb nicht auslösen. | Gegnerpass einspielen und eine passende Auslösestellung mit Schalter an/aus vergleichen. Komi und Wertungsmodus des GTP-Aufbaus explizit prüfen. Betroffene Messungen erst nach Prüfung ihrer tatsächlichen Aufrufpfade benennen. |
| GTP-3 | P2 | Optionale GTP-Befehlsnummern werden als Befehlsname gelesen. | `17 protocol_version` sowie nummerierten ungültigen Befehl prüfen; Erfolgs- und Fehlerantwort müssen dieselbe Nummer tragen. Unnummerierte Befehle weiter unterstützen. |

Prüfstand: gezielter statischer Review, keine Testsuite und keine lokale Ausführung
laut übermitteltem Bericht. Frühere Läufe mit unnummerierten Befehlen sind durch
GTP-3 allein nicht widerlegt. GTP-2 betrifft nur Aufrufpfade, die diese Passregel
über den Adapter tatsächlich aktivieren sollen.

### Erster index.html-Bughunt: Terra

| ID | Priorität laut Review | Befund / Prüfauftrag | Reproduktion und erwartetes Verhalten |
|---|---|---|---|
| UI-1 | P1 | Abschalten der KI invalidiere eine laufende Anfrage nicht; `applyAIResult` prüfe nicht `aiEnabled`. | KI während der Suche abschalten, Stellung unverändert lassen und Antwort abwarten. Kein nachträglicher KI-Zug; Such-/Wartezustand muss beendet werden. |
| TRAIN-1 | P2 | `showFinalScore` trainiert bei Spielende; Undo revidiere weder Gewichte noch `_trained`. | Letzten Pass bzw. KI-Aufgabe zurücknehmen und Partie mit anderem Ergebnis abschließen. Prüfen, welches Ergebnis tatsächlich trainiert wird. Eine Strategie gegen Training auf verworfenen Ergebnissen erst nach Befund festlegen. |
| UI-2 | P2 | Wechsel des Wertungsmodus nach Spielende aktualisiere das angezeigte Ergebnis nicht, während der SGF-Export neu zählt. | Fertige Partie zwischen Fläche/Territory umschalten und Anzeige mit SGF-Ergebnis vergleichen. |
| UI-3 | P2 | Nach einem Pass können Markierungen der Zählvorschau im Canvas-Cache bleiben, obwohl die Vorschau deaktiviert wurde. | Zählvorschau öffnen, passen, Canvas und Vorschauzustand unmittelbar prüfen; kein veraltetes Overlay. |

Prüfstand: statischer Review; laut Bericht noch nicht im Browser reproduziert.

### Zweiter index.html-Bughunt: Astra

| ID | Priorität laut Review | Befund / Prüfauftrag | Reproduktion und erwartetes Verhalten |
|---|---|---|---|
| TRAIN-2 | P2 | Wechsel der KI-Farbe behalte Trainingsbeispiele ohne Farbangabe; ein gemeinsamer Reward orientiere sich an der letzten KI-Farbe. | Zunächst KI Weiß, später KI Schwarz, anschließend Schwarzsieg. Frühere Weiß-Beispiele dürfen nicht als Schwarz-Siegzüge belohnt werden. Farbzuordnung bzw. Verwerfen des Puffers untersuchen. |
| NET-1 | P2 | `PolicyNet.reset()` rufe `localStorage.removeItem()` ungeschützt vor der Gewichtsinitialisierung auf. Bei gesperrtem Speicher bleibe das Netz unverändert; auch der Reset zur Divergenzbehandlung sei betroffen. | Speicherzugriff gezielt werfen lassen. Der Reset im Arbeitsspeicher muss trotzdem vollständig erfolgen. |

Prüfstand: TRAIN-2 laut Bericht durch Code-Nachverfolgung gestützt. NET-1 wurde laut
Review an der extrahierten Methode mit werfendem Speicherzugriff geprüft; keine
vollständige Browser-Reproduktion beider Befunde berichtet.

### Einordnung und Untersuchung

- Zuerst Quellenstand und Reproduktion je ID dokumentieren; danach gezielte Korrektur
  mit einem Test, der den ursprünglichen Fehler erkennt.
- TRAIN-1/TRAIN-2 könnten gespeicherte Gewichte beeinflussen, falls die entsprechenden
  Bedienabläufe vorkamen. Das ist eine Hypothese zur beobachteten Fehlbewertung,
  keine nachgewiesene Ursache. Gespeicherte Gewichte vor einem Reset sichern, falls
  sie für die Untersuchung gebraucht werden.
- Den konkreten Q-/Aufgabefall und die bisherigen Ursachenmessungen unten getrennt
  halten. Weder ein knapper PWA-Sieg noch diese Reviews belegen allein eine Regression.
- Dieser Eintrag dokumentiert Prüfaufträge; er erteilt kein Go für Messläufe,
  Engine-Vergleiche, Spieländerungen oder Merges. Die bestehenden Freigaberegeln gelten.

## Bughunt-Verifikation am Stand 17117ae (07.11.2026)

- Untersuchung der neun Prüfaufträge abgeschlossen auf Quellencommit
  `17117ae822dfa0d836964311cf2f6aa41d489f2e`; Bericht:
  [`docs/bughunt-verifikation.md`](docs/bughunt-verifikation.md).
- GTP-1 und GTP-3 im unveränderten Adapterprozess reproduziert. GTP-2:
  fehlendes extra im instrumentierten Adapteraufruf und Guard im Engine-Code bestätigt.
- UI-1, TRAIN-1, UI-2, UI-3, TRAIN-2 und NET-1 im Funktionstest mit aus index.html
  ausgeschnittenem Code nachvollzogen; DOM/Canvas/Workerzustellung bzw. ausgewählte
  Trainingsoperationen sind Attrappen. Details und Grenzen stehen pro ID im Bericht.
- Neun gezielte Prüfungen erfolgreich, ohne Suche/Partien/GNU Go. Keine volle Testsuite
  und kein vollständiger Browsertest: Playwright vorhanden, Chromium-Datei fehlt.
  Der spätere von Hazeberry übermittelte Browserbericht ist im Nachtrag von
  docs/bughunt-verifikation.md eingeordnet; Rohartefakte hier nicht unabhängig geprüft.
- **Trainingshypothese eingegrenzt:** netMaxBlend ist im geprüften Default 0;
  die lokalen PolicyNet-Gewichte steuern damit die Zugwahl nicht. TRAIN-1/TRAIN-2
  erklären unter dieser Einstellung keine direkte Verschlechterung der Zugwahl.
  Tatsächliche Browserparameter wurden nicht gelesen; Endspiel-Netz ist gesondert.
- Reproduktionsskript mit Quellhash-Prüfung:
  `auswertung/bughunt-20261107/reproduce.cjs`. Es erwartet die Defekte dieses Stands,
  ist keine Testsuite für einen reparierten Stand. Ergebnisse:
  `docs/daten/bughunt-20261107/results.json`.
- Spiel und Adapter unverändert. Weitere Korrekturen und Messungen brauchen die
  bestehenden Freigaben; dieser Befund liefert selbst kein Go.

## Gezielte Browserdiagnose vorbereitet (07.11.2026)

- Startanleitung und Fälle: [`docs/bughunt-browser.md`](docs/bughunt-browser.md).
- `node auswertung/bughunt-20261107/browser.cjs --aus /tmp/codex-bughunt-browser`
  prüft sieben Szenarien für sechs index.html-Befunde im echten Chromium.
  UI-1 nutzt einen echten Worker mit kontrollierter Antwort; keine Suchpartien.
- JSON, Markdown und Screenshots; Exit 1 = reproduzierter Defekt, Exit 2 =
  fehlende Voraussetzung/Testfehler, Exit 0 = in diesen Abläufen nicht reproduziert.
  Fehlender Browser wird nie als grün übersprungen.
- Hier nur Syntax, Statuslogik und Fehlerweg bei fehlendem Browser geprüft.
  Hazeberry meldete danach alle sieben Browserfälle auf 7e300914 reproduziert, ohne
  Testfehler (Playwright 1.56.1/Chromium 154 laut Bericht). Rohartefakte hier nicht
  unabhängig geprüft; Nachtrag in docs/bughunt-verifikation.md. Playwright/Chromium-Installation
  steht in der Anleitung; optional manueller Workflow `bughunt-browser.yml`.
- Kein Actions-Lauf gestartet, keine Spielkorrektur. Normale CI unverändert.

## Querverweis zum ursprünglichen Repo (08.11.2026)

Die Passregel-Arbeit (Stufen A bis C, Zähldiagnose und Vorsprung-Untersuchung) sowie
Claudes unabhängige Wiederholung desselben Bughunt-Testskripts werden in
[`Hazeberry/Go-html-Game-MoE`](https://github.com/Hazeberry/Go-html-Game-MoE) dokumentiert.
Maßgeblich sind dort die Berichte und Daten; hier genügt der Verweis:

- Passregel: [Vergleich](https://github.com/Hazeberry/Go-html-Game-MoE/blob/main/docs/passregel-vergleich.md),
  [Zähldiagnose](https://github.com/Hazeberry/Go-html-Game-MoE/blob/main/docs/passregel-zaehldiagnose.md),
  [Vorsprung-Untersuchung](https://github.com/Hazeberry/Go-html-Game-MoE/blob/main/docs/passregel-vorsprung.md).
- Bughunt-Wiederholung: [Bericht](https://github.com/Hazeberry/Go-html-Game-MoE/blob/main/docs/bughunt-wiederholung.md)
  und [Rohdaten/Screenshots](https://github.com/Hazeberry/Go-html-Game-MoE/tree/main/docs/daten/bughunt-wiederholung/lauf1/),
  dort durch [PR #286](https://github.com/Hazeberry/Go-html-Game-MoE/pull/286) übernommen.
- Die dortige Übergabe-Übersicht wird in [PR #287](https://github.com/Hazeberry/Go-html-Game-MoE/pull/287)
  vorbereitet (bei dieser Lektüre noch offen, Kopf `d60b40c45440d66a4dbd78a2b694dc9e50fbb2d8`).
  Nach dessen Merge ist sie im dortigen `HANDOFF.md` zu finden.

In `Hazeberry/codex` liegen Bughunt-Verifikation und Testaufbau aus
[PR #20](https://github.com/Hazeberry/codex/pull/20) (gemergt, `9c2dc2ab0fdd60c0e538114134810c15ae874aa1`).
Ergebnisse werden hier nicht aus dem anderen Repo abgeschrieben.
Beide Repos können unterschiedliche Quellenstände haben; Befunde sind an ihrem
jeweils dokumentierten Commit zu lesen. Dieser Querverweis erteilt keine Freigabe.

## Aktueller Stand in diesem Repository
- **H/R-Hauptlauf jetzt konkret vorbereitet:** §13 in `docs/prior-anhebung-ohne-orakel.md`.
  Aktueller Default-Ausgangspunkt `6a6fe6960c029551ed8405e62d3b633b36a93645`.
  480 je Arm/Gegner = 2880 regulär +18 Wiederholungen +4 Archivkontrollen.
  Hauptlauf nicht gestartet; neue Budget-/Paketplanung vor Merge zur Durchsicht.
  Nach Go zuerst neuer passender Engine-Vergleich, dann bedingt Hauptlauf.
  Planungswert 25–30 Runnerstunden/3–5 h Wanduhr; feste Jobobergrenzen §13.
- Ziel der weiteren Arbeit: `Hazeberry/codex`. Vollständiger Import mit Historie durch
  PR #1, Merge `1bf2ff3cc5258038697b91a79224c70e25761d87`.
- Vorabfestlegung für die Prior-Anhebung ohne Orakel: `docs/prior-anhebung-ohne-orakel.md`.
  Umsetzung A/H/R samt Tests und manuellen Workflows durch PR #7 gemergt; Stand
  `6bfaa33d69822f13a049b5813d4b6c77b63b61a3`. Standard aus, keine UI-Aktivierung.
- Hazeberry gab nach Durchsicht/Konkretisierung §10 Go für Merge, Engine-Vergleich und
  technische Probe. Diese Freigaben sind ausgeführt; kein Hauptlauf-Go.
- Engine-Vergleich 42164242839 **gültig, GLEICH**: 130 KI-Abfragen, Auswahlbewertung ab
  Zug 81 an je 25 Stellen für Schwarz/Weiß. Ausgangsstand, neu aus und A stimmen bei
  Zügen, Kindern, Priors, N/W und Suchzufallsverbrauch überein; keine weitergehende Abdeckung.
- Technische Probe 42164396423 **gültig**, 58/58 Partien, 70/70 Pflichtprüfungen,
  keine Ausfälle/Timeouts. 18 Wiederholungen identisch, vier Archivkontrollen passend;
  H/R gegen beide Gegner in beiden Farben tatsächlich angehoben. Maximum 44,3 s.
- **Keine Wirkungsauswertung** aus der Probe. Ob H hilft oder besser als R ist, bleibt
  offen. Hauptumfang, Budget und Pakete sind jetzt in §13 konkretisiert, vor Merge
  zur Durchsicht; Hauptlauf braucht eigenes Go. GNU-Go-geprägte Daten und GNU-Go-Wertung bleiben enthalten.
- Ergebnisse §11/12, vollständige Rohartefakte unter
  `docs/daten/prior-anhebung-ohne-orakel/`. Quellen-SHA und SHA-256 sind gesichert.
- **Diagnose abgeschlossen, gültig:** Lauf 42130235314, Versuch 2, mit drei übernommenen
  Reproduktionen aus Lauf 42124976320. Alle sechs Pflichtreproduktionen bestanden.
  Bericht: `docs/diagnose-laufzeit-absturz.md`; Rohdaten und Actions-Bericht unter
  `docs/daten/diagnose-laufzeit-absturz/lauf1/`. Die Diagnose selbst ändert keinen Spielcode.
- In den beiden untersuchten langen Fuego-Partien dominiert die Wartezeit beim
  GNU-Go-Orakel: P 766,6 von 783,7 s, S 1160,6 von 1198,5 s. Zugfolgen und Endstände
  stimmen exakt mit dem Archiv überein. Die interne GNU-Go-Lesefunktion ist nicht ermittelt.
- GNU Go stürzt in allen vier Wiederholungen nach identischer Zugfolge mit Zug 82
  (Weiß K8) bei `genmove B` ab. Erster Auslöser war bereits `mc=81`, mit tatsächlichem
  Eingriff in N und S. **Die Vermutung „vor dem ersten Eingriff“ ist damit widerlegt.**
  Eigenständiges GTP-Replay unter GDB reproduziert den SIGSEGV; Quellcodeursache offen.
- PR #6 ist nach Konfliktauflösung gemergt: `d688b257f8499d8c0a62e9639ecfde3b7f21a07d`.
  Die historischen Angaben darunter stammen aus der übernommenen Übergabe.
- Node- und Browser-CI von PR #7 waren grün. Die Abmeldung der PR-Aktivität wurde
  versucht; GitHub verweigerte `updateSubscription` mit FORBIDDEN (App-Berechtigung).

## Aktuelle Einzelfall-Diagnose: Aufgabe nach Zug 113

- Nutzer-Go vom 06.11.2026, Untersuchung in PR #10 gemergt:
  `0756a9f67ff255a7e2ed6746cd1549ac80ff2a39`.
- Lauf 42169766921 gültig: 22 externe Bewertungen, sechs vollständige Fortsetzungen.
  Weiß gewinnt alle sechs gegen GNU Go 1; eigene KI mit 3000 Simulationen
  W+72,5/W+136,5. Deutlicher Befund für voreilige Aufgabe in diesem Fall,
  technische Ursache der negativen Q-Werte noch offen. Keine Defaultänderung.
- Bericht: `docs/untersuchung-aufgabe-113.md`, Rohartefakte unter
  `docs/daten/aufgabe-113/lauf1/`, Quellenstand `09cdb2be87d693f6eb89a190274e7e49f5769b9a`.
- Separater Protokollfehler: Undo ließ alte KI-Diagnosen stehen (P14/P13 bei Zug 42).
  Korrektur in PR #9 nach grüner CI 42169061237 gemergt:
  `0a0cc366cb9bdd33d8d3048c26e5d4ef3408c92d`.

## deathTransfer-Diagnose abgeschlossen

- Aufbau PR #12 nach Go und grüner CI gemergt: `8ad41af0c0e67da49b6caf8653c3bd5695d44960`.
- Lauf 42256206462 gültig: 32 Pakete, 192 Abfragen plus 192 bestandene Messkontrollen.
  Dosen 0/0,5/1, acht Stellungen, zwei Farben/Seeds und 120/3000 Simulationen.
- An beiden aktuellen Aufgabestellungen bleibt Q auch ohne Transfer unter −0,95;
  bereits gebuchte Gefangene dominieren dort. Vor Gruppenverlusten und in der
  historischen Stellung kann Transfer Q deutlich beeinflussen. In 64/64 Kontexten
  blieb der gewählte Zug zwischen Dosis 0 und 1 gleich; kein Spielstärkeurteil.
- Bericht: `docs/death-transfer-diagnose.md`, vollständige Rohdaten unter
  `docs/daten/death-transfer/lauf1/`. Keine Defaultänderung, keine neuen Partien.
- Nächste Ursachenfrage: Gefangenenterm/Rollout-Verluste/Skalierung und Q-Aufgabe.
  Kein Go für neue Partien oder Spieländerungen aus dieser Diagnose ableiten.
- PR-Aktivität abmelden versucht; GitHub verweigerte die Mutation (FORBIDDEN).

## Gefangenenwert, Rollouts und Q-Aufgabe

- PR #14 nach Go und grüner CI gemergt: `acf0559204e24dc36620af4384d11068c3552c17`.
- Lauf 42261233661 gültig: 72 Pakete, 576 Abfragen plus 576 bestandene Kontrollen.
  Vier Arme (captureCap 0/200 × Rollout-Tiefe 24/0), 18 Archivstellungen.
- Zusätzliche Gefangene vor dem Schlag entstehen überwiegend bereits im Suchbaum,
  nicht erst im Rollout. An den Aufgabestellungen dominieren initiale Gefangene.
- Deckel 200 verhindert die Q-Aufgabesonde in beiden aktuellen Archivpfaden;
  Tiefe 0 verhindert sie nicht. Keine neuen Partien, kein Nachweis besserer Züge.
- Bericht: `docs/gefangene-rollout-aufgabe.md`, vollständige Rohdaten unter
  `docs/daten/gefangene-rollout/lauf1/`. Engine und Defaults unverändert.
- Kandidat für eigene nächste Vorabfestlegung: kontrollierte Fortsetzungen mit
  captureCap=200 gegen Default, Aufgabe von Zugqualität trennen; noch kein Go dafür.
- PR #13 ist nach grüner CI gemergt: `b70c469dc97808877419be2c088ddbe93a053c54`.

## Kontrollierte Gefangenendeckel-Fortsetzungen

- PR #16 nach Go und grüner CI gemergt: `92501db0d2aa86e6f1a56707fad8718f3cf24245`.
- Lauf 42266545848 gültig: 64 vollständige Partien/32 Paare, keine Ausfälle.
  Vier Startstellungen, beide Farben, 120/3000 Simulationen, Seeds 761/762;
  captureCap 0/200, Aufgabe aus, GNU Go1 Gegner und Flächenschiedsrichter.
- Gemischt: Deckel 8 Paare besser, 14 gleich, 10 schlechter. Nach Aufgabe113
  in allen acht Kontexten schlechter (−2 bis −42), nach Aufgabe127 in allen
  besser (+14 bis +58). Kein allgemeiner Stärkegewinn und keine Defaultänderung.
- Siege ohne Aufgabe: Default 31/32, Deckel 30/32. Nur vier ausgewählte
  Stellungen; nicht als allgemeine Siegquote interpretieren.
- Bericht: `docs/gefangenendeckel-fortsetzungen.md`, vollständige Rohdaten und
  64 entpackte SGFs unter `docs/daten/deckel-fortsetzungen/lauf1/`.
- Ergebnis-PR #17 nach grüner CI gemergt: `6a6fe6960c029551ed8405e62d3b633b36a93645`.
- Die Q-Aufgabe bleibt als eigener nächster Ansatz offen; keine Freigabe
  für eine Spieländerung oder neue Messung aus diesem Pilot ableiten.
- PR #15 nach grüner CI gemergt: `d6249e484ac70f46dbed5bced7b63fc9ce027674`.

## Herkunft der folgenden Übergabe

Übernommen aus `Hazeberry/Go-html-Game-MoE`, Commit
`818ba2a54763a9977b802f48b74b9f41aaee868b`, ursprünglicher Branch `ccr-00c70722-9f7z7m`.
Die PR- und Laufnummern der historischen Merges und Spielstärke-Ergebnisse beziehen
sich auf **das ursprüngliche Repository**. Diese Spielstärke-Zahlen wurden übernommen
und nicht neu berechnet. Verweise auf die neue technische Diagnose und die Branchliste
beziehen sich auf `Hazeberry/codex`.

## Merges (Commit auf main)
| PR | Inhalt | Merge |
|---|---|---|
| #265 / #266 | Vorabfestlegung und Umsetzung Stufe 1 (Schalter `extra.kandidatenOrakel`, Standard aus) | `1d3dd75` / `1c71b02` |
| #267 | Nachtrag Laufzeitprobe Stufe 1, Rohdaten | `5b42448` |
| #268 | Workflow Hauptversuch Stufe 1, Prior-Prüfung, vollständige Paare | `370df8e` |
| #269 | Nachtrag Hauptversuch Stufe 1 (§13), Rohdaten | `c45298a` |
| #270 | Vorabfestlegung Vierarm-Versuch (§12 Engine-Vergleich nachgetragen) | `4eb8dee` |
| #272 | Engine-Vergleich in Actions, Regel in CLAUDE.md | `f87f148` |
| #271 | Umsetzung Vierarm (Arme N, P, pEnd, Bericht, Workflows, Tests) | `bd93a21` |
| #273 | Nachtrag technische Probe Vierarm (§13), Rohdaten | `8740574` |
| #274 | Nachtrag Hauptlauf Vierarm (§14), Rohdaten | `645a325` |

## Ergebnisse
**Stufe 1** (Lauf 41563696817, Seeds 231/232, gültig, §13 in `docs/kandidaten-orakel.md`):
- S − A: GNU Go +24,7 [+19,9; +29,5] (478 Paare), Fuego +36,0 [+30,1; +42,0] (480 Paare).
- Der kombinierte Eingriff (Orakelzug als zusätzliches Wurzelkind mit Spitzenprior) verbessert den Endstand.
  ZS (Rang-Nachbar) verschlechtert ihn; das ist keine isoliert gemessene Eingriffskost.
- Siegquote gegen Fuego mit 100 Spielen je Zug. Die frühere 48-%-Messung (50 Spiele je Zug) ist nicht direkt vergleichbar.

**Vierarm-Versuch** (§14 in `docs/kandidaten-orakel-vierarm.md`, Hauptlauf 41627980348, Seeds 234/235, gültig):
- N − A: kein nachgewiesener Unterschied (GNU Go +0,7 [−5,2; +6,6], Fuego −0,9 [−6,9; +5,1]).
- S − N: positiv (+26,3 GNU Go; +30,4 Fuego). P − A: positiv (+13,8 GNU Go; +11,7 Fuego).
- Nicht getrennt voneinander abgezogen; die Mittelwerte sind additiv (N − A) + (S − N) = S − A.
- Ausfall: Partie 127 gegen GNU Go in allen Armen (SIGSEGV). Die damalige Vermutung
  einer Stellung vor dem ersten Eingriff wurde durch die neue Diagnose korrigiert (siehe oben).
- Laufzeit: 83,5 h Partiezeit, rund 4 h 40 min Wanduhr. Einzelne Fuego-Partien bis 1118 s;
  die neue Diagnose ordnet deren dominanten Zeitanteil den GNU-Go-Orakelabfragen zu.

**Engine-Vergleich** (Lauf 41617738140, alt `370df8e`, neu `e0de66f`): GLEICH über 26 Replays und 1328 KI-Abfragen.
Die Vorprüfung ist bestanden. Abdeckung: S und ZS nur 22 bzw. 16 Stellen ab Zug 81, für ZS nur 5 mit Fall d.
Fall d1, e, c0 und d0 kamen nicht vor.

## Historische offene Punkte aus der übernommenen Übergabe (05.11.2026)
- **GNU-Go-Verwandtschaft:** Hypothese, Ursache nicht nachgewiesen. Dass der Gewinn auch gegen Fuego auftrat,
  spricht gegen eine rein gegnerspezifische Ausnutzung. Er trennt aber nicht den Einfluss von (a) dem
  GNU-Go-Orakel, (b) den GNU-Go-geprägten Netz- und Musterdaten und (c) der GNU-Go-Wertung (Endstand-Zählung).
- **Interne GNU-Go-Ursachen:** Die beiden langen Fuego-Partien und der Absturz sind
  reproduziert und zeitlich eingegrenzt. Offen bleiben die GNU-Go-Funktion hinter den
  teuren Orakelabfragen und der Quellcodefehler hinter dem SIGSEGV. Der GDB-Backtrace
  enthält keine GNU-Go-Funktionsnamen. Stellungsgleichheit ist bestätigt, die frühere
  Vermutung „vor dem ersten Eingriff“ widerlegt; siehe Diagnosebericht.
- **Nutzung ohne Orakel:** offen. Der Versuch zeigt, dass die Prior-Anhebung hilft, auch bei Zügen, die schon
  Kandidaten sind (P − A +13,8 und +11,7; S − N positiv). Arm P braucht aber GNU Go, um zu wissen, welchen Zug
  er anheben soll. N − A zeigt keinen nachgewiesenen Gewinn; das ist **kein** Beleg für Wirkungslosigkeit.
  Die nächste Frage: Lässt sich die nützliche Anhebung mit einer rein engineinternen Regel finden? Eine solche
  Regel dürfte das Orakel nicht als Eingabe nutzen, sonst bliebe die Abhängigkeit bestehen. Das ist eine neue
  Fragestellung mit eigener Vorabfestlegung und eigenem Go. Der neue Entwurf steht in
  `docs/prior-anhebung-ohne-orakel.md`. Aktueller Stand: siehe oben und §11/12; nur die
  Wirksamkeitsfrage und der Hauptlauf bleiben für diese konkrete Regel offen.

## Regeln aus den letzten Sitzungen
- **Nur ein ausdrückliches „Go“ startet einen Lauf** oder merged einen PR. Eine Empfehlung ist kein Go. Diesen Fehler gab es einmal (Engine-Vergleich), er ist im Nachtrag vermerkt.
- Messungen laufen ausschließlich in GitHub Actions. Engine-Vergleiche je Stand in einem eigenen Prozess, nie zwei Stände im selben Node-Prozess (CLAUDE.md).
- „Gleich“ erst nach Vorprüfung (Priors je Wurzelkind vorhanden und endlich, Abdeckung der Arme und Fälle), sonst KEIN URTEIL.
- Zulässige Partieausfälle stehen getrennt von bestandenen Prüfungen. Ein fehlendes Pflichtprotokoll ist kein Ausfall, sondern KEIN URTEIL.
- Merge mit voller Kopf-SHA (`expectedHeadSha`), Merge-Methode `merge`. Docs mit Vorgaben vor dem Merge von Hazeberry lesen lassen.

## Branches

- In `Hazeberry/codex` nach Merge löschbar, nicht gelöscht: `claude/repository-import`
  (#1), `claude/prior-anhebung-ohne-orakel` (#2), `claude/diagnose-laufzeit-absturz` (#3),
  `claude/diagnose-laufzeit-fortsetzen` (#4), `claude/diagnose-ergebnissicherung` (#5),
  `claude/prior-ohne-orakel-umsetzung` (#7) und `claude/prior-ohne-orakel-probe-ergebnisse` (#8).
- `claude/diagnose-laufzeit-ergebnisse` ist nach Merge von PR #6 ebenfalls löschbar.
- `claude/diagnose-undo-protokoll` ist nach Merge von PR #9 ebenfalls löschbar.
- `claude/aufgabe-113-untersuchung` (#10) und `claude/death-transfer-diagnose` (#12)
  sind nach Merge ebenfalls löschbar.
- `claude/death-transfer-ergebnisse` (#13) und `claude/gefangene-rollout-aufgabe` (#14)
  sind nach Merge ebenfalls löschbar.
- `claude/gefangene-rollout-ergebnisse` (#15) und `claude/gefangenendeckel-fortsetzungen`
  (#16) sind nach Merge ebenfalls löschbar.
- `claude/gefangenendeckel-fortsetzungen-ergebnisse` (#17) ist nach Merge ebenfalls löschbar.
- `claude/hr-hauptlauf-default` bleibt bis zum Abschluss der Hauptlauf-Vorbereitung erhalten.
- Die historische Liste löschbarer Branches aus der alten Übergabe gilt ausschließlich
  für `Hazeberry/Go-html-Game-MoE`; daraus folgt kein Löschauftrag in einem der Repositories.
