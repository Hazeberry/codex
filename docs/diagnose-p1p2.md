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
  dem Gegner verliert oder gewinnt? Gebucht in **Punkten über alle geeigneten Partien**, ohne Auswahl
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
  „GG“ heißt Gegner (in den Fuego-Archiven also Fuego); GNU Go ist dort nur Schiedsrichter.
- Wechselt ein Punkt die Art, wird er einem von **sieben Posten** zugeordnet (siehe `POSTEN` im
  Code): eigene Steine sterben, eigenes Gebiet verloren, neutral an den Gegner, neutral an die KI,
  vom Gegner zurückgewonnen, eigene tote Steine leben wieder, tote Gegner-Steine leben wieder.
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
  Muster (siehe README). Die Abdeckung könnte dadurch begünstigt sein, besonders ab Zug 81, wo das
  Netz zusätzliche Kandidaten einbringt (**Hypothese**, nicht gemessen). Das Ergebnis misst „bildet
  die Liste GNU Gos Wahl ab“, nicht „sind die Kandidaten gut“.
- **Fehlt GNU Gos Zug, fehlt nicht automatisch ein guter Zug.**
- **Stichprobe:** 40 Partien × 30 Stellungen je Archiv, Stellungen innerhalb einer Partie sind
  nicht unabhängig; deshalb zählt die Partie als Einheit.
- **Fuego-Archive:** Der Gegner ist Fuego mit schwacher Suche; die Partieverläufe unterscheiden sich
  von denen gegen GNU Go.
- **Zeitfenster:** Zug 81 bis 200; über die Eröffnung und das späte Endspiel sagt das nichts.
- **GNU-Go-Statusurteil (P1)** ist selbst ein Urteil, kein Beweis, und hängt von vorherigen Abfragen ab.

## 7. Ausführung

Workflow `.github/workflows/diagnose-p1p2.yml`, nur `workflow_dispatch`. Eingaben: `neu` (Archive,
die gerechnet werden; Standard `alle`), `vorlauf` (früherer Lauf, aus dem die nicht neu gerechneten
Archive übernommen werden) und `fortsetzen_aus` (früherer Lauf, aus dem fertige oder angefangene
Pakete fortgesetzt werden; leer = `vorlauf`). Ablauf: Plan → P1-Pakete (je ein Job) und P2 (je Archiv
ein Job) → Job „Berichte“ mit `bericht/p1.md`, `bericht/p2.md`, `status.txt` als Artefakt und
Zusammenfassung. Ungültig in einem Teil macht den Lauf rot.

Lokal wird nur mit Stubs und kurzen Partieausschnitten getestet (`tests/diagnose-p1p2.js`), nicht mit
GNU Go und nicht mit ganzen Archiven.

**Start erst nach ausdrücklichem „Go“ von Hazeberry.**

## 8. Änderungen am Ablauf nach dem ersten Start (2. November 2026)

Der erste Lauf (Actions-Lauf 41480291668, Kopf `8271c92cf86633f32b01afa2706475edea0d3a9a`) rechnete
P1 je Archiv in einem Job. Die drei Archive mit 480 Partien waren nach 91, 93 und 126 Minuten mit P1
fertig; das Archiv `fuego-siege-D` mit 960 Partien lag nach über vier Stunden noch in P1, das
Zeitlimit von 300 Minuten je Job schien zu knapp. Deshalb, **bevor irgendein Ergebnis gelesen
wurde**:

1. **Vollständigkeit.** Der Bericht prüft gegen die vier erwarteten Archive
   (`auswertung/diagnose/erwartet.js`). Fehlt ein Archiv ganz („Archiv fehlt vollständig“) oder
   zum Teil (unter 98 % der geeigneten Partien in P1, unter 36 Partien in P2), ist der Teil ungültig:
   „KEIN URTEIL“, der Lauf wird rot. Vorher hätte ein ganz fehlendes Archiv die Prüfung nicht
   ausgelöst. Doppelte Einträge (gleiches Archiv, gleiche Nr.) zählen einmal, ein brauchbarer Eintrag
   geht vor einem fehlgeschlagenen.
2. **P1 in Paketen.** Die geeigneten Partien (nach Nr. sortiert) werden in Pakete zu je 120 Partien
   zerlegt (`--paket K`; 480 Partien = 4 Pakete, 960 = 8). Jedes Paket ist ein eigener Job mit eigenem
   Artefakt `p1-<archiv>-NN`. An den Messgrößen ändert das nichts: Jede Partie wird einzeln gebucht, die
   Wiederholungskontrolle gilt weiter für die ersten 5 Partien des Archivs (also Paket 1).
3. **Fortsetzen.** `--fortsetzen` überspringt Partien, die in der Ausgabedatei schon gebucht sind
   (P2: schon erfasst), und wiederholt fehlgeschlagene; eine halbe letzte Zeile nach einem Abbruch wird
   ignoriert. Jede Partie wird sofort angehängt, ein Abbruch verliert höchstens die laufende.
   Fertige oder angefangene Pakete früherer Läufe holt der Workflow über `fortsetzen_aus`.
4. **Fortschritt.** P1 und P2 melden „N von M Partien erledigt, K verbleibend“ (P1 alle 5 Partien).
5. **Sicherung bei Zeitlimit.** Der Rechenschritt hat ein eigenes Zeitlimit (150 Minuten), kürzer als
   das des Jobs (200 Minuten). Läuft er ab, ist nur dieser Schritt rot; der Upload mit `if: always()`
   läuft danach. **`always()` allein ist kein Nachweis.** Lokal belegt: Wird ein Paket mit SIGKILL
   abgebrochen, bleibt der Teilstand erhalten und das Fortsetzen rechnet nur den Rest
   (`tests/diagnose-p1p2.js`). Auf GitHub belegt das erst die Probe
   `.github/workflows/diagnose-timeout-probe.yml` (rund drei Minuten, kein GNU Go, keine Partien): Der
   Schritt läuft absichtlich ab, der Job „Prüfung“ ist nur grün, wenn der Teilinhalt im Artefakt
   angekommen ist.
   **Nachtrag (Probe gelaufen, Actions-Lauf 41521966719, 2. November 2026, Kopf
   `e8df7b4677b315bfbef029171e4c5fee1a150e40`):** Der Schritt mit Zeitlimit wurde nach 73 Sekunden
   (Limit 1 Minute) abgebrochen und als `failure` markiert, der Upload mit `if: always()` lief danach
   und war erfolgreich, der Job „Prüfung“ war grün: 4 von 7 Zeilen im Artefakt (Teilinhalt, nicht
   vollständig). Der Gesamtlauf der Probe steht deshalb auf `failure`; das ist der erwartete Ausgang,
   nicht ein Fehler (grün wäre er nur, wenn der Schritt nicht abgelaufen wäre). **Belegt** ist das für
   das Zeitlimit eines Schritts. Das Zeitlimit des ganzen Jobs ist nicht geprüft; der Workflow verlässt
   sich nicht darauf, weil das Schritt-Limit (150 Minuten) vor dem Job-Limit (200 Minuten) greift.
6. **Wiederverwendung.** Die drei fertigen Archive des ersten Laufs (Artefakte `diagnose-<name>`)
   werden mit `vorlauf=41480291668` und `neu=fuego-siege-D` übernommen und nicht neu gerechnet. Sie
   stammen aus unveränderter Rechenlogik (gleiche Buchung und Kandidatenrekonstruktion, nur anders
   zerlegt), aber aus einem anderen Lauf als `fuego-siege-D`; das gehört in die Aussage.

Die Änderungen betreffen Ablauf und Prüfregeln, nicht Auswahl, Kennzahlen oder Schwellen. Sie wurden
vor dem Lesen irgendeines Ergebnisses festgelegt.

## 9. Ergebnis (Nachtrag, 2. November 2026)

Actions-Lauf 41480291668 (Kopf `8271c92cf86633f32b01afa2706475edea0d3a9a`), alle vier Archive in
**einem** Lauf gerechnet, nichts übernommen oder neu gerechnet; das Verfahren in §8 (Pakete,
Fortsetzen, Wiederverwendung) kam nicht zum Einsatz. Berichtsjob 125542111191: `p1=0 p2=0`, beide
Teile **gültig**. Die Berichte stehen unverändert in `docs/daten/diagnose-p1p2/p1.md` und `p2.md`.
Die Rohdaten (Artefakte `diagnose-<archiv>`) liegen im Lauf und sind dort bis zum 31. Januar 2027
abrufbar; sie sind noch **nicht** im Repo, der Download aus dem Container wurde abgewiesen.
**Sicherung (gelaufen, Actions-Lauf 41530351261, keine Neuberechnung):** Der Workflow
`.github/workflows/diagnose-sichern.yml` lud die vier Artefakte des Laufs und legte die
Ergebniszeilen verlustfrei komprimiert unter `docs/daten/diagnose-p1p2/rohdaten/<archiv>/` ab
(`p1.jsonl.gz`, `p2.jsonl.gz`). Dazu `manifest.json` (Artefakt-ID und -Digest, Zeilenzahlen,
Prüfsummen) und `fehlgeschlagen-p1.md`. **Alle vier Archive sind vollständig gesichert:** P1 hat je
Archiv so viele Zeilen wie geeignete Partien (480, 480, 480, 960), P2 je 40 Zeilen und 1200
Stellungen (darin die 46 Passfälle, die der Bericht nicht zählt). Wiederholungskontrolle in P1:
je Archiv die ersten 5 Partien gleich, 0 anders.

Die Berichtsjobs dieses Laufs prüften noch mit der Fassung vor §8 (ein ganz fehlendes Archiv wäre
nicht aufgefallen). Hier waren alle vier Archive vorhanden: 40 von 40 Partien je Archiv in P2, in
P1 958 von 960 (`fuego-siege-D`, 99,8 %) und 480 von 480 in den übrigen drei. **Die zwei Partien ohne Buchung** sind beide aus `fuego-siege-D`: Nr. 450 (Seed 22800450, 361 Züge,
KI Schwarz) und Nr. 585 (Seed 22800585, 342 Züge, KI Weiß). In beiden brach der Schiedsrichter ab:
`final_status_list dead → ? GNU Go beendet (null, SIGSEGV)`, also ein Absturz von GNU Go (Stufe 1)
bei der Statusabfrage. Das ist ein Fehler des Auswertewerkzeugs, nicht der Partie; ob er sich
wiederholen lässt oder von der Stellung abhängt, ist nicht untersucht. 958 von 960 (99,8 %)
erfüllen die Schwelle von 98 %. Ob die zwei Partien die Aussage ändern würden, ist ebenfalls nicht
untersucht. Einzelheiten: `docs/daten/diagnose-p1p2/rohdaten/fehlgeschlagen-p1.md`.

### P1: Buchung zwischen Zug 100 und 200 (Punkte je Partie, Sicht der KI; 2398 Partien)

- **Summe:** `fuego-siege-D` +13,8 [10,3; 17,3], `muster-ohne-vorgabe-f-D` −5,7 [−10,0; −1,3],
  `leeres-brett-g-D` −33,5 [−37,3; −29,7], `muster-ohne-vorgabe-g-D` −36,8 [−40,4; −33,2]; alle Archive
  −9,7 [−11,8; −7,5]. Anteil der Partien mit negativer Summe: 40,4 / 56,0 / 79,2 / 83,3 %
  (alle 59,9 %).
- **Posten (alle Archive, Mittel je Partie):** eigene Steine sterben −8,2; eigenes Gebiet geht
  verloren −31,1; neutrales Gebiet an den Gegner −48,4; neutrales Gebiet an die KI +42,2; vom Gegner
  zurückgewonnen +34,0; eigene tote Steine leben wieder +6,0; tote Gegner-Steine leben wieder −4,2.
  Die Summe der Posten ist je Partie die Veränderung der Zählung (Kontrolle bestanden, sonst wäre
  der Teil ungültig).
- **Lesart (nur Beschreibung):** Zwischen Zug 100 und 200 wechseln viele Punkte in beide Richtungen;
  die Nettosumme ist ein kleiner Rest großer gegenläufiger Posten. Der größte negative Einzelposten
  ist „neutrales Gebiet an den Gegner“, der größte positive „neutrales Gebiet an die KI“. In den
  Archiven gegen GNU Go ist die Summe negativer (rund −34 bis −37) als in denen gegen Fuego
  (−5,7 und +13,8); das ist eine Beobachtung, kein Befund über den Gegner.
- **Nicht ausgewertet:** Ursachen der Posten und Aussagen über Zugqualität. Vergleiche der Archive
  untereinander sind **nur beschreibend, nicht kausal**: Gegner, Seed und Engine-Stand unterscheiden
  sich, und die Archive wurden nicht gepaart gegeneinander gemessen. Auch der Unterschied zwischen
  den Archiven gegen GNU Go und denen gegen Fuego ist deshalb nur eine Beobachtung.

### P2: Kandidatenabdeckung gegenüber GNU Go (160 Partien, 4754 Stellungen)

- **GNU Gos Zug unter den 16 Wurzelkindern:** 38,9 % [36,1; 41,6] (Mittel je Partie; gepoolt 38,8 %).
  Je Archiv 31,6 % (`muster-ohne-vorgabe-f-D`) bis 43,0 % (`muster-ohne-vorgabe-g-D`).
- **Ohne das Endspiel-Netz** (Liste vor dem Netz): 34,2 % [31,3; 37,2]. **Nur durch das Netz**
  hineingekommen: 6,6 %; **durch das Netz hinausgedrängt**: 2,0 %. Das Netz änderte die
  Wurzelkinder in 84,5 % der Stellungen (die Netzkontrolle hat Zusatzkandidaten festgestellt).
- **In der Liste überhaupt** (nach dem Netz, beliebiger Rang): 99,4 %. Die Liste umfasst im Mittel
  207 Züge je Stellung (122 bis 284), die Zahl sagt deshalb wenig. In rund 61 % der Stellungen steht
  GNU Gos Zug nicht unter den ersten 16, sein Rang liegt also darüber; wie weit darüber, ist in
  diesem Bericht nicht ausgewiesen (siehe §10).
- **Die KI spielte denselben Zug wie GNU Go** in 12,7 % der Stellungen.
- 46 Stellungen, in denen GNU Go passt, sind nicht gezählt. Ausgeschlossen wegen Nicht-Reproduktion: 0.
  Stellungen ohne Antwort von GNU Go: 0.

**Grenzen (wie in §6):** Abdeckung ist keine Zugqualität: Fehlt GNU Gos Zug unter den Kindern,
fehlt nicht automatisch ein guter Zug. **Hypothese, nicht gemessen:** Weil GNU Go zugleich Lehrer
von Netz und Mustern ist, könnten der Anteil „nur durch das Netz“ und die Abdeckung insgesamt
dadurch begünstigt sein. Die Diagnose enthält keine Messung, die das prüft (etwa eine Referenz, die
nicht Lehrer ist); die Richtung und Größe einer solchen Begünstigung sind unbekannt.

**Folgeentscheidung:** keine. Ob und wie sich daraus ein Versuch zu Breite, Suche oder Netz ableitet,
entscheidet Hazeberry; dieses Dokument legt dafür keine Regel fest.

## 10. Korrekturen zur Einordnung (2. November 2026)

Nach dem Nachtrag in §9 habe ich mündlich eine Einordnung gegeben. Vier Aussagen waren zu stark.
Hier stehen sie in der Fassung, die die Daten tragen.

1. **P2, „in der Liste überhaupt“.** Die 99,4 % sind kaum aussagekräftig, weil die Liste im Mittel
   207 Züge umfasst (aus den Rohdaten gezählt). Der Satz „liegt an der Begrenzung auf 16“ war eine
   Deutung. Belegt ist nur: In rund 61 % der Stellungen liegt GNU Gos Zug auf einem Rang über 16.
   **Unterschied zu früher:** `punktverlust-muster.md` §5 fand GNU Gos besten Zug in 70 % der
   Stellungen unter den ersten 16 Kandidaten, P2 findet 34,2 % (vor dem Netz) und 38,9 % (nach dem
   Netz). Warum, ist **ungeklärt**. Die Messungen unterscheiden sich in Vorgabe (neun Steine gegen
   keine), Gegner, Fenster der Züge, Art der Referenz (`top_moves` gegen `reg_genmove`), Zufall der
   Liste (dort auf 0, hier der echte Strom) und Engine-Stand. Welche dieser Unterschiede die Zahl
   erklären, ist nicht untersucht; P2 ist deshalb nicht als Verschlechterung zu lesen.
2. **P1, „das Ergebnis entscheidet sich im Gebiet, nicht bei den Steinen“.** Das ist eine
   Beschreibung dieser vier Archive im Fenster Zug 100 bis 200 und nur sie. Die Zusammenfassung der
   sieben Posten zu „Steine“ und „Gebiet“ ist meine, nicht Teil des Berichts. Ursachen sind nicht
   untersucht, und GNU Gos Urteil bei Zug 100 ist vorläufig. Dass sich das mit `punktverlust-muster.md`
   „deckt“, ist zu stark: Dort sind es andere Partien (neun Vorgabesteine, GNU Go Stufe 1), ein
   anderes Fenster (Zug 40 bis Ende) und ein anderer Engine-Stand. Verglichen wurde nicht.
3. **Suchskalierung.** „Mehr Suche ist kein Hebel“ war falsch ausgedrückt. Gemessen
   (`skalierung.md` §5, Selbstspiel): Eine Verdopplung bringt +75 Elo (38 bis 112) von 120 auf 240
   Simulationen und +55 (19 bis 92) von 240 auf 480. Mehr Suche hilft also messbar. Die Punktschätzung
   ist bei der zweiten Verdopplung niedriger; ein Abflachen ist nicht gesichert (die Intervalle
   überlappen weit). Gemessen ist bis 480
   Simulationen, die KI rechnet im Spiel 750 bis 1300. „Die Grenze liegt in der Bewertung“ bleibt
   eine **Hypothese**. Ihre Belege sind klein oder indirekt: 0 von 8 gegen 0 von 17 Siegen bei 1000
   statt 120 Simulationen gegen GNU Go, und dass mehr Suche GNU Gos besten Zug nicht öfter trifft
   (16,5 / 14,4 / 14,4 %, `punktverlust-muster.md` §6). Letzteres misst Übereinstimmung mit GNU Go,
   keine Spielstärke.
4. **Netzwirkung.** „Das Netz wirkt über den Prior, kaum über die Abdeckung“ ist eine
   **Hypothese**, kein Befund. Belegt ist: P2 findet durch das Netz 4,7 Prozentpunkte mehr
   Abdeckung (34,2 → 38,9 %), und das Netz ändert die Wurzelkinder in 84,5 % der Stellungen. Die
   Messreihe zur Dosis zeigt +46,9 (λ 0 → 0,5) und +15,5 (λ 0,5 → 0,8) sowie L9 −1,9 [−9,3; +5,6]
   und L10 −4,1 [−11,4; +3,2]. Mehr Netzpunkte unter den Kandidaten (`endspielNetzTop` 8) ergaben
   +1,3 [−6,0; +8,6]; „verworfen“ heißt dort nur, dass die Obergrenze unter +10 liegt, nicht
   „wirkungslos“. Alle diese Messungen laufen unter anderen Bedingungen als P2 (sechs Vorgabesteine,
   GNU Go Stufe 1). Kein Versuch trennt die Wirkung auf den Prior von der auf die Kandidaten;
   die Gesamtwirkung des Netzes (N0 −71 gegen GNU Go, −68 gegen Fuego, `komponenten.md`) sagt
   nichts über den Weg.

**Bisher nicht erklärt, geplant:** Eine kleine Auswertung der vorhandenen P2-Rohdaten (Rang vor und
nach dem Netz, nach Archiv und Spielphase) soll klären, welche der Unterschiede in Punkt 1 sich mit
diesen Daten überhaupt prüfen lassen. Sie ist noch nicht vorbereitet.
