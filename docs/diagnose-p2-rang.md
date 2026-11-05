<!--
Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
-->
# P2-Rang: Rangverteilung von GNU Gos Zug in den gesicherten Rohdaten (Vorabfestlegung)

**Stand: gelaufen** (Actions-Lauf 41538801704, 2. November 2026, Ergebnis in Abschnitt 8). Der Lauf
startete erst nach ausdrücklichem „Go“ von Hazeberry. Die Rohausgabe liegt auf einem neuen
Ergebnisbranch (Abschnitt 7). **Es gibt keine automatische Folgeentscheidung.**

## 1. Anlass und Frage

In `docs/diagnose-p1p2.md` (§9, §10) steht: GNU Gos Zug (Stufe 10) liegt in 38,9 % der Stellungen
unter den 16 Wurzelkindern, ohne das Netz in 34,2 %. Früher fand `punktverlust-muster.md` §5 den
besten Zug von GNU Go in 70 % der Fälle unter den ersten 16 Kandidaten. Warum der Wert so viel
niedriger ist, ist ungeklärt, und der Rang selbst steht in keinem Bericht.

Diese Auswertung beantwortet nur, was in den vorhandenen Rohdaten steht:

1. Auf welchem **Rang** steht GNU Gos Zug in der Kandidatenliste, **vor** und **nach** dem
   Endspiel-Netz, getrennt nach Archiv und Spielphase?
2. Wie wirkt das Netz auf diesen Rang?
3. Auf welchem Rang steht der **von der KI gespielte** Zug?
4. Welche der Unterschiede zu den früheren 70 % lassen sich mit diesen Daten überhaupt prüfen,
   und erklären sie die Lücke?

Nicht Teil dieser Auswertung: neue Partien, GNU Go, ein Replay, eine Liste der Standardwerte oder
des Codes zwischen alter und heutiger Engine, ein Orakel-Test, jede Änderung am Spiel.

## 2. Material

`docs/daten/diagnose-p1p2/rohdaten/<archiv>/p2.jsonl.gz` für die vier Archive (`leeres-brett-g-D`,
`muster-ohne-vorgabe-g-D`, `muster-ohne-vorgabe-f-D`, `fuego-siege-D`): je 40 Partien, 1200
Stellungen (30 je Partie, Zug 81 bis 200, jeder zweite KI-Zug), gesichert aus dem Diagnose-Lauf
41480291668. Je Stellung: `mc`, `g` (GNU Gos Zug, −1 = Pass), `gespielt`, `vor`, `nach` (die
Kandidatenliste vor und nach dem Netz, sortiert), `kids` (die Wurzelkinder), `netz`.

## 3. Nenner

Jede Zelle (Archiv × Phase) weist aus:

| Größe | Bedeutung |
|---|---|
| Stellungen | alle Stellungen der Zelle |
| Pässe | GNU Go passt (`g < 0`); nicht gezählt |
| fehlend | kein Referenzzug (`g` fehlt oder `null`); nicht gezählt |
| **N_gültig** | Stellungen − Pässe − fehlend |

Die Rangverteilung verteilt sich **vollständig auf N_gültig**: Rang 1, 2–4, 5–8, 9–16, 17–24,
25–32, > 32 (in der Liste, Rang über 32) und **nicht gelistet** (der Zug steht nicht in der Liste).
„> 32“ und „nicht gelistet“ sind verschieden und werden nie zusammengelegt. Für den gespielten Zug
der KI gilt dasselbe mit eigenem Nenner (gespielt ≥ 0; KI-Pässe und fehlende Angaben getrennt).

Weitere Festlegungen:
- **Phasen:** Zug 81–120 (`mc` 80–119), 121–160 (120–159), 161–200 (160–199), dazu „alle“.
- **Gewichtung:** Die Spalten zeigen das Mittel je Partie (jede Partie zählt gleich), für „Rang ≤ 16“
  mit 95-%-Intervall (Normalnäherung über die Partien); gepoolt steht in der JSON-Ausgabe. Median und
  Quartile des Rangs stehen gepoolt, nur über die gelisteten Stellungen.
- **Netz:** Der Rang nach dem Netz wird mit dem Rang davor verglichen (besser, gleich, schlechter;
  „nicht gelistet“ gilt als schlechter als jeder Rang). „Hinein“: nur durch das Netz unter den 16
  Wurzelkindern; „hinaus“: durch das Netz herausgefallen.
- **Farbe der KI:** getrennte Tabelle (Schwarz, Weiß).

## 4. Gültigkeit und Kontrolle

Zwei Zustände, gültig oder ungültig. Ungültig heißt „**KEIN URTEIL**“ mit Grund im Bericht, die
Ausgabe wird trotzdem gesichert, und der Lauf wird rot. Ungültig ist der Lauf, wenn

- eines der vier Archive fehlt, ein Archiv nicht genau 40 Partien hat oder eine Partie nicht
  als reproduziert gekennzeichnet ist,
- in einer Zelle Pässe + fehlend + N_gültig nicht die Stellungen ergeben oder die Rangklassen sich
  nicht auf N_gültig summieren,
- die Wurzelkinder nicht in jeder Stellung genau die ersten 16 der Liste nach dem Netz sind,
- die **Kontrolle gegen den P2-Bericht** scheitert. Je Archiv müssen N_gültig (1200, 1184, 1200,
  1170) und die gepoolten Anteile „in Kindern“, „ohne Netz in Kindern“, „nur durch das Netz“,
  „durch das Netz verloren“ und „in der Liste“ (= 1 − nicht gelistet) auf eine Dezimalstelle mit
  `docs/daten/diagnose-p1p2/p2.md` übereinstimmen.

Die Kontrollwerte stehen im Code und werden im Test gegen `p2.md` geprüft.

## 5. Methodischer Abgleich mit den früheren 70 %

Früher (`punktverlust-muster.md` §5): Rang 1 = 20 %, Rang ≤ 16 = 70 %, Median 7, bei 1354
Stellungen, Liste vor der Suche (ohne Netz). Der Bericht stellt dem die Werte für die Liste **vor**
dem Netz gegenüber und führt je Unterschied auf, ob die Rohdaten ihn prüfen können:

| Unterschied | prüfbar mit den Rohdaten? |
|---|---|
| Spielphase (früher bis Partieende, jetzt Zug 81–200) | teilweise, nur innerhalb 81–200 |
| Gegner (früher GNU Go Stufe 1, jetzt GNU Go oder Fuego) | ja, innerhalb der vier Archive |
| Farbe der KI | ja |
| Netz (früher keins) | ja (Liste vor gegen nach) |
| Vorgabe (früher neun Steine, jetzt keine) | **nein**, keine Vorgabepartien in den Daten |
| Referenz (früher `top_moves`, jetzt `reg_genmove`) | **nein**, `top_moves` steht nicht darin |
| Zufall der Liste (früher auf 0, jetzt der echte Strom mit Gleichständen) | **nein**, nur Rangfolgen, keine Werte |
| Engine-Stand | **nein**, nicht Teil dieser Auswertung |

Dazu der Bericht: die **Spanne** von „Rang ≤ 16 vor dem Netz“ über die prüfbaren Faktoren (Archiv ×
Phase und Farbe, Zellen mit N_gültig ≥ 100) und ob die früheren 70 % innerhalb oder außerhalb liegen.
**Die Lage der 70 % zur Spanne erklärt den alten Unterschied nicht.** Die Lesart ist einseitig:
- **Außerhalb** der Spanne: Kein gewichteter Mittelwert über Archiv, Phase und Farbe kann die 70 %
  erreichen (er liegt zwischen dem kleinsten und größten Zellwert). Diese Faktoren allein erklären den
  Unterschied dann nicht.
- **Innerhalb** der Spanne: Damit ist **nichts erklärt**. Die Spanne beschreibt nur, wie weit die
  jetzigen Werte streuen; wie sich die alte Stichprobe auf diese Faktoren verteilte, ist nicht bekannt.

In beiden Fällen bleiben Vorgabe, Referenzart, Zufall der Liste und Engine-Stand als mögliche, **hier
nicht entscheidbare** Ursachen.

## 6. Grenzen

- Der Rang von GNU Gos Zug ist eine Übereinstimmung mit einer Referenz, keine Zugqualität. GNU Go ist
  zugleich Lehrer von Netz und Mustern; ob das die Werte begünstigt, ist eine Hypothese.
- Die Rohdaten enthalten Rangfolgen, keine Bewertungswerte; Gleichstände sind darin nicht zu sehen.
- 40 Partien je Archiv, 30 Stellungen je Partie; Stellungen einer Partie sind nicht unabhängig, deshalb
  zählt die Partie als Einheit.
- Die Phase nach Zug 200 ist in den Daten nicht enthalten.

## 7. Ausführung

Workflow `.github/workflows/diagnose-p2-rang.yml`, nur von Hand, ohne Eingaben, rund zwei Minuten
(gemessen ist nur das Lesen der Daten mit 0,4 s; der Rest ist Zählen). Er braucht kein GNU Go und
kein Replay. Das Ergebnis (`p2-rang.md`, `p2-rang.json`) geht dauerhaft nach
`docs/daten/diagnose-p2-rang/` auf einen **neuen Ergebnisbranch**
`claude/diagnose-p2-rang-ergebnis-<lauf>` (nie auf `main`, nie mit Force); daraus wird der
Pull Request geöffnet. Dafür hat der Workflow das Schreibrecht `contents: write` (von Hazeberry
freigegeben). Zusätzlich liegt die Ausgabe als Artefakt `p2-rang`.

**Start erst nach ausdrücklichem „Go“ von Hazeberry.**

## 8. Ergebnis (Nachtrag, 2. November 2026)

Actions-Lauf 41538801704, Kopf `a33e32dcb59240421490866276ec52c9ad1efff9`, Job 125597373108, rund
10 Sekunden. **Gültig:** Alle Kontrollen aus Abschnitt 4 bestanden (Nenner, Rangklassen, Wurzelkinder =
erste 16 nach dem Netz in jeder Stellung, Übereinstimmung mit dem P2-Bericht). Bericht und Zahlen
unverändert in `docs/daten/diagnose-p2-rang/p2-rang.md` und `p2-rang.json`. Alle Zahlen: 160 Partien,
4800 Stellungen, davon 46 Pässe von GNU Go (nicht gezählt), 0 fehlende Referenzzüge, N_gültig 4754.
Mittel je Partie, Intervalle 95 %.

**Eine Einschränkung vorweg, die ich erst am Ergebnis bemerkt habe:** In allen 160 Partien spielt die KI
**Schwarz** (Tabelle „Nach Farbe“: Weiß 0 Stellungen). Die Farbe wechselt mit der Partienummer (gerade
Nr. = KI Schwarz, ungerade = Weiß; in beiden Archiven nachgezählt: 240/240 und 480/480), und die
Auswahlregel von P2 (`nr % 12 = 0` bzw. `nr % 24 = 0`) trifft nur gerade Nummern. Das gilt für **P2
insgesamt** (auch für die Zahlen in `diagnose-p1p2.md` §9, dort jetzt deutlich nachgetragen), nicht nur
für diese Auswertung. Die technischen Gültigkeitsprüfungen haben es nicht erkannt, und die Zeile „Farbe der KI – prüfbar: ja“ im Abgleich war falsch:
Die Farbe ist mit diesen Daten **nicht** prüfbar.

**Rang von GNU Gos Zug, Liste vor dem Netz** (alle Archive und Phasen, N_gültig 4754):

| Rang | 1 | 2–4 | 5–8 | 9–16 | 17–24 | 25–32 | > 32 | nicht gelistet |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Anteil | 7,7 % | 9,9 % | 6,2 % | 10,4 % | 9,7 % | 8,9 % | 46,6 % | 0,6 % |

Rang ≤ 16: 34,2 % [31,3; 37,2], Median 29 (Quartile 9 und 63). **Nach dem Netz:** Rang ≤ 16 38,9 %
[36,1; 41,6], Median 23 (9 und 47), Rang > 32 noch 37,6 %.

- **Spielphase:** Rang ≤ 16 vor dem Netz 33,6 / 33,9 / 35,3 % (Zug 81–120 / 121–160 / 161–200), nach dem
  Netz 38,1 / 38,1 / 41,4 %. Kaum Unterschied.
- **Archiv** (Rang ≤ 16 vor dem Netz): `muster-ohne-vorgabe-f-D` 26,4 %, `leeres-brett-g-D` 34,6 %,
  `fuego-siege-D` 37,6 %, `muster-ohne-vorgabe-g-D` 38,4 %. Das ist beschreibend, nicht kausal (Gegner,
  Seed und Engine-Stand verschieden).
- **Wirkung des Netzes** auf den Rang von GNU Gos Zug: besser 39,6 %, gleich 41,6 %, schlechter 18,7 %.
  Nur durch das Netz unter die 16 Kinder: 6,4 %, durch das Netz herausgefallen: 2,0 %. Der Anteil
  „hinein“ ist am kleinsten in `fuego-siege-D` (2,9 %) und am größten in `leeres-brett-g-D` (9,3 %).
- **Rang des gespielten Zugs** der KI in der Liste nach dem Netz (Nenner 4800): Rang 1 30,0 %, Rang 2–4
  25,9 %, 5–8 9,5 %, 9–16 34,6 %; nie über 16 (die Wurzelkinder sind die ersten 16). Die KI spielt GNU
  Gos Zug in 12,5 % der Stellungen; im P2-Bericht sind es 12,7 %, dort mit Nenner 4754 ohne die
  GNU-Go-Pässe (gleiche Zählung, anderer Nenner).

**Abgleich mit den früheren 70 %** (`punktverlust-muster.md` §5: Rang 1 = 20 %, Rang ≤ 16 = 70 %,
Median 7, n = 1354, Liste vor der Suche, ohne Netz). Jetzt, Liste vor dem Netz: Rang 1 = 7,7 %,
Rang ≤ 16 = 34,2 %, Median 29. Die ganze Verteilung liegt anders, nicht nur die Schwelle bei 16. Die
Spanne der prüfbaren Faktoren (Archiv × Phase, Rang ≤ 16 vor dem Netz) reicht von 22,0 % bis 45,5 %;
die 70 % liegen **oberhalb der gesamten Spanne**. Beschreibend: **Keine untersuchte Untergruppe
(Archiv, Spielphase, Archiv × Phase; Liste vor dem Netz) erreicht die früheren 70 %.** Die höchste
Zelle liegt bei 45,5 %. Das ist ein Befund über diese Zellen, keine Erklärung des alten Unterschieds.
Verglichen ist die Liste vor dem Netz (früher gab es keins). Die Farbe ist nicht untersucht (siehe oben). **Offen und mit diesen Daten nicht prüfbar:** Vorgabe
(neun Steine früher), Referenzart (`top_moves` gegen `reg_genmove`), Zufall der Liste (früher auf 0,
jetzt der echte Strom) und der Engine-Stand. Welcher davon die Lücke trägt, ist nicht entschieden.

**Was daraus folgt:**
- Im Median steht GNU Gos Zug vor dem Netz auf Rang 29, also weit hinter den 16 Wurzelkindern.
- Eine Erweiterung von 16 auf 24 oder 32 Kinder würde den Anteil von 34,2 % (vor dem Netz) auf rund
  44 % beziehungsweise 53 % heben (Summe der Rangklassen, gleiche Daten); rund 47 % lägen weiter dahinter.
  Ob das dem Spiel nützt, sagt diese Auswertung nicht.
- Die Aussage „die 70 % von früher gelten heute nicht mehr“ ist **nicht** belegt: Die Unterschiede in
  den Messungen sind zu groß.

**Folgeentscheidung:** keine. Weitere Versuche sind nicht gestartet.
