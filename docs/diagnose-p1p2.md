<!--
Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
-->
# Diagnose P1/P2 auf vorhandenen Archivpartien (Vorabfestlegung)

Stand: Vorbereitung. **Der Lauf ist nicht gestartet.** Er startet erst nach ausdrücklichem „Go“
von Hazeberry. Dieses Dokument legt vorab fest, was gemessen wird, wie ausgewählt wird und wann
ein Ergebnis gültig ist. Ergebnisse kommen als Nachtrag in dieses Dokument, Rohdaten unter
`docs/daten/diagnose-p1p2/`.

## 1. Zweck und Abgrenzung

Zwei Fragen an Partien, die schon im Archiv liegen (Standard ohne Vorgabe):

- **P1 – Buchung:** Wohin gehen die Punkte, die die KI zwischen Zug 100 und Zug 200 gegenüber
  GNU Go verliert oder gewinnt? Gebucht in **Punkten über alle geeigneten Partien**, ohne Auswahl
  nach Abstieg und ohne Anteile.
- **P2 – Kandidatenabdeckung:** Steht der Zug, den GNU Go in der Stellung wählt, unter den
  16 Wurzelkindern, mit denen die Suche der KI tatsächlich lief? Das ist eine Aussage über die
  **Abdeckung** der Kandidatenliste, ausdrücklich **keine Qualitätsaussage**: Ein Zug, den GNU Go
  nicht wählt, kann gleichwertig oder besser sein.

Nicht Teil dieser Diagnose: neue Partien, ein Arm mit Zeitbudget („Arm Z“), eine Entscheidungsregel
für Breiten- oder Simulationsversuche, jede Änderung am Spiel. **Es gibt keine automatische
Folgeentscheidung.** Was aus den Zahlen folgt, entscheidet Hazeberry nach dem Bericht.

## 2. Material

Vier Archive aus gemergten Messläufen, alle mit `ki = {mctsFixedSims: 120, resignEnabled: 0}`,
Komi 7,5, ohne Vorgabe, GNU Go Stufe 1 als Schiedsrichter:

| Name (Workflow) | Archiv | Partien | Gegner | Seed |
|---|---|---|---|---|
| `leeres-brett-g-D` | `docs/daten/leeres-brett/lauf1/g-D.jsonl.gz` | 480 | GNU Go | 222 |
| `muster-ohne-vorgabe-g-D` | `docs/daten/muster-ohne-vorgabe/lauf1/g-D.jsonl.gz` | 480 | GNU Go | 226 |
| `muster-ohne-vorgabe-f-D` | `docs/daten/muster-ohne-vorgabe/lauf1/f-D.jsonl.gz` | 480 | Fuego (100 Spiele) | 226 |
| `fuego-siege-D` | `docs/daten/fuego-siege/lauf1/D.jsonl.gz` | 960 | Fuego (50 Spiele) | 228 |

Alle Partien haben mindestens 200 Züge und keine Vorgabe; „geeignet“ heißt: ≥ 200 Züge, keine
Vorgabe (≥ 2 Steine), nicht abgebrochen. Gleiche Partien können in P1 und P2 vorkommen; die beiden
Teile werden getrennt berichtet und nicht miteinander verrechnet.

## 3. Nachweis, dass der heutige Stand die Archivpartien reproduziert

„Seit dem 31.10. unverändert“ reicht für die älteren Archive nicht. Deshalb drei Belege, in dieser
Reihenfolge der Beweiskraft:

1. **Commits und Läufe** (`auswertung/diagnose/engine-abgleich.js`, Ausgabe
   `docs/daten/diagnose-p1p2/abgleich.txt`): Leeres Brett = Actions-Lauf 40943994425, Commit
   `443724e6831677ab15a64e909bfec072a253f7ef` (PR #215, 29.10.); Muster ohne Vorgabe = Lauf
   41022192878, Commit `e40d82eb140099701d7fc4f275be275e06c374d6` (PR #219, 30.10.); Siege gegen
   Fuego = Lauf 41200615724, Commit `0a03266149fad3833cc254f3b08b547f4ff4b07e` (PR #225, 31.10.).
2. **Parameter und Code** (derselbe Abgleich): Standardwerte und Quelltext der Skripte
   `shared-go-logic` und `worker-ai` damals gegen heute, ohne Kommentare. Unterschiede stehen in
   `abgleich.txt`: neue Parameter (`passNachGegnerpass` u. a., Standard aus), die Zählvorschau
   (nur Anzeige) und der Rahmen um `getAIMove`. Dieser Vergleich zeigt Unterschiede, beweist aber
   keine Gleichheit des Verhaltens; deshalb Beleg 3.
3. **Exaktes Nachspielen** (`auswertung/diagnose/reproduktion-pruefung.js`, Ausgabe
   `docs/daten/diagnose-p1p2/reproduktion.txt`): Je Archiv fünf Partien (Nr. 2, 3, 100, 101, 240)
   werden mit dem heutigen `index.html` bis Zug 200 mit demselben Seed nachgespielt
   (`Math.random = mulberry32(seed)`, Parameter wie im Harness). Jeder KI-Zug muss mit dem
   archivierten Zug übereinstimmen. Ergebnis der Vorabprüfung siehe `reproduktion.txt`.

Zusätzlich wird das **Endspiel-Netz** ab Zug 81 (`endspielNetzAb` = 80) im Nachspielen
beobachtet: Die Liste der Kandidaten wird vor und nach `endspielNetzWurzel` festgehalten, und die
tatsächlichen Wurzelkinder (nach `_mctsKids`) werden mit den ersten 16 der Liste nach dem Netz
verglichen.

**Im Lauf selbst** wird dasselbe je Partie wiederholt: jede Partie der P2-Stichprobe wird nachgespielt;
weicht ein KI-Zug vom Archiv ab, wird die Partie ab dieser Stelle **nicht ausgewertet** (zählt als
nicht reproduziert) und im Bericht genannt.

## 4. P1 – Buchung zwischen Zug 100 und 200

Verfahren (`auswertung/diagnose/p1-buchung.js`, baut auf `auswertung/besitz-verlauf.js` auf):

- GNU Go Stufe 1 beurteilt die Stellung nach Zug 100 und nach Zug 200 (`final_status_list`).
  Marken genau 100 und 200: Das Statusurteil hängt von vorherigen Abfragen ab, weitere Marken
  würden die Vergleichbarkeit stören.
- Jeder Brettpunkt bekommt eine Art: KI-Stein, KI-Gebiet, GG-tot, neutral, GG-Stein, GG-Gebiet,
  KI-tot. Besitz: KI-Stein, KI-Gebiet, GG-tot = +1; neutral = 0; GG-Stein, GG-Gebiet, KI-tot = −1.
- Wechselt ein Punkt die Art, wird er einem von **sieben Posten** zugeordnet (siehe `POSTEN` im
  Code): eigene Steine sterben, eigenes Gebiet verloren, neutral an GNU Go, neutral an die KI,
  von GNU Go zurückgewonnen, eigene tote Steine leben wieder, tote GNU-Go-Steine leben wieder.
  Alles in Punkten.
- **Kontrolle je Partie (Identität):** Σ der sieben Posten = Veränderung derselben Zählung
  (Besitz × Punkte der Arten) zwischen Zug 100 und 200. Weicht eine Partie ab, ist der Teil P1
  ungültig.
- Ausgewiesen wird je Archiv und gepoolt: Summe in Punkten je Posten, Mittel je Partie in Punkten,
  95-%-Intervall des Mittels (Normalnäherung, 1,96 · s/√n), Anzahl Partien. Keine Anteile, keine Auswahl nach Abstieg.

**Gültigkeit P1** (nur technisch): ≥ 98 % der geeigneten Partien je Archiv ausgewertet; Identität
bei jeder ausgewerteten Partie exakt; keine Wechsel in „sonstige“ (nicht gebuchte) Posten; alle
361 Felder je Stellung zugeordnet; Wiederholungskontrolle (die ersten 5 Partien werden zweimal
beurteilt und müssen identische Arten liefern). Eine Quote wie „KI gewinnt zu oft/zu selten“ ist
**kein** Gültigkeitskriterium.

## 5. P2 – Kandidatenabdeckung gegenüber GNU Go

Verfahren (`auswertung/diagnose/p2-kandidaten.js`, `auswertung/diagnose/wurzel-replay.js`):

- **Auswahl der Partien:** je Archiv 40 Partien: Von den geeigneten Partien (nach Nr. sortiert)
  werden die mit `nr % floor(n/40) = 0` genommen, die ersten 40 (also Nr. 12, 24, 36 … bzw. 24, 48,
  72 … bei 960 Partien). Keine Auswahl nach Ergebnis.
- **Auswahl der Stellungen:** je Partie jeder zweite KI-Zug im Fenster mc 80 bis 199 (Zug 81 bis 200),
  beginnend mit dem ersten, das sind 30 Stellungen je Partie.
- **Rekonstruktion:** Nachspielen der Partie wie im Harness (gleicher Seed, `adaptiveBudgetEnabled`
  0, `vorgabeSteine` 0, `E.neuePartie()`), an den ausgewählten Stellungen werden die Kandidatenliste
  vor dem Netz, nach dem Netz und die tatsächlichen Wurzelkinder festgehalten.
- **Referenz:** GNU Go Stufe 10, `reg_genmove`, fester `--seed`, Komi 7,5, gleiche Stellung
  (Brett, Ko, Farbe am Zug). Die Antwort wird nicht gespielt.
- **Kennzahlen je Stellung:** GNU Gos Zug unter den 16 Wurzelkindern (ja/nein); unter den Kindern
  auch ohne das Netz (Liste vor dem Netz); nur durch das Netz hineingekommen; durch das Netz
  hinausgedrängt; in der Liste überhaupt; Rang vor und nach dem Netz; gleicher Zug wie von der KI
  gespielt; Netz hat die Kinder verändert.
- **Passfälle:** Antwortet GNU Go mit Pass, wird die Stellung nicht gezählt und separat
  ausgewiesen („GNU Go passt in N Stellungen“).
- **Gewichtung:** Primär: Mittel je Partie (jede Partie gleich), danach Mittel über die Partien mit
  95-%-Intervall (Normalnäherung, 1,96 · s/√n), je Archiv und über die Archive. Sekundär: gepoolt über
  Stellungen, nur zur Ansicht.
- **Netzkontrolle** (getrennt gemeldet, nicht vermischt): Netz ausgeführt (Liste vor ≠ nach, oder
  Flag gesetzt) ≠ Prior verändert ≠ zusätzliche Kandidaten. Meldet die Kontrolle keine
  Zusatzkandidaten, ist P2 deshalb **nicht ungültig**; das ist dann ein Befund.

**Gültigkeit P2** (nur technisch): je Archiv ≥ 36 Partien in der Auswertung; ≥ 95 % der ausgewählten
Partien je Archiv exakt reproduziert (alle KI-Züge bis Zug 200 gleich); in jeder Stellung ab Zug 81 das Netz tatsächlich ausgeführt; ≥ 98 % der
GNU-Go-Antworten verwertbar (GNU Go 3.8 kann abstürzen; Ausfälle zählen als nicht verwertbar);
Wiederholungskontrolle (die ersten 3 Partien werden zweimal nachgespielt und müssen dieselben
Kinder liefern). Der Zustand ist zweiwertig: gültig oder ungültig; ungültig heißt „KEIN URTEIL“
mit Grund im Bericht, und der Lauf wird rot. Ein Ergebnis wird nicht nachträglich von „unklar“ zu
„negativ“ umgedeutet.

## 6. Grenzen

- **Der Lehrer ist die Referenz.** GNU Go ist zugleich Lehrer des Endspiel-Netzes und der
  Muster (siehe README). Die Abdeckung wird dadurch nach oben verzerrt, besonders ab Zug 81, wo das
  Netz zusätzliche Kandidaten einbringt. Das Ergebnis misst „bildet die Liste GNU Gos Wahl ab“,
  nicht „sind die Kandidaten gut“.
- **Fehlt GNU Gos Zug, fehlt nicht automatisch ein guter Zug.**
- **Stichprobe:** 40 Partien × 30 Stellungen je Archiv, Stellungen innerhalb einer Partie sind
  nicht unabhängig; deshalb zählt die Partie als Einheit.
- **Fuego-Archive:** Der Gegner ist Fuego mit schwacher Suche; die Partieverläufe unterscheiden sich
  von denen gegen GNU Go.
- **Zeitfenster:** Zug 81 bis 200; über die Eröffnung und das späte Endspiel sagt das nichts.
- **GNU-Go-Statusurteil (P1)** ist selbst ein Urteil, kein Beweis, und hängt von vorherigen Abfragen ab.

## 7. Ausführung

Workflow `.github/workflows/diagnose-p1p2.yml`, nur `workflow_dispatch`, ohne Eingaben. Je Archiv ein
Job (P1, dann P2), danach der Job „Berichte“ mit `bericht/p1.md`, `bericht/p2.md`, `status.txt` als
Artefakt und Zusammenfassung. Ungültig in einem Teil macht den Lauf rot.
Lokal getestet wird nur mit Stubs und kurzen Partieausschnitten (`tests/diagnose-p1p2.js`), nicht mit
GNU Go.

**Start erst nach ausdrücklichem „Go“ von Hazeberry.**
