<!--
Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
-->
# Kandidaten-Orakel, Vierarm-Versuch: Aufnahme und Gewicht getrennt (Vorabfestlegung, Entwurf)

**Stand: Hauptlauf gelaufen und gültig (§14).** Ursprünglich: Entwurf, nichts umgesetzt. Umsetzung (Arme N und P in der Engine, Harness,
Protokoll, Workflows, Tests), technische Probe und Hauptlauf beginnen **jeweils** erst nach eigenem „Go“ von
Hazeberry. Grundlage ist der abgeschlossene Versuch Stufe 1 (`kandidaten-orakel.md`, Ergebnis §13). Es gibt
**keine automatische Folgeentscheidung**.

## 1. Anlass und Frage

Stufe 1 hat gezeigt: Der kombinierte Eingriff S (GNU Gos Zug als zusätzliches Wurzelkind und mit Spitzenprior)
hebt den Endstand gegenüber dem Default A, gegen GNU Go um +24,7 [+19,9; +29,5] und gegen Fuego mit 100
Spielen je Zug um +36,0 [+30,1; +42,0] (`kandidaten-orakel.md` §13). Stufe 1 trennt nicht, **woher** der
Gewinn kommt (§3, §6 dort). Der Vierarm-Versuch fragt:

1. Bringt es bereits etwas, GNU Gos **fehlenden** Zug mit seinem **natürlichen Prior** anzubieten?
2. Wie viel bringt die **zusätzliche Prior-Anhebung**?
3. Hilft die Anhebung auch bei Zügen, die **bereits unter den 16 Kindern** stehen?

Er ist ein Ausschnitt aus dem Vollentwurf von Stufe 1 (dort sieben Arme mit den Kontrollen ZN, ZP, ZS), ohne
die Rang-Nachbar-Kontrollen.

## 2. Arme

| Arm | Orakelzug fehlt unter den 16 Kindern (Fall d, d1) | Orakelzug ist schon Kind (Fall c) | alle übrigen Fälle (a, b, c0, c1, d0, e, x) |
|---|---|---|---|
| **A** – Default | keine Änderung | keine Änderung | keine Änderung |
| **N** – Aufnahme | als 17. Kind mit **natürlichem** Prior P′ | keine Änderung | keine Änderung |
| **P** – Gewicht | keine Änderung | Spitzenprior wie bisher | keine Änderung |
| **S** – kombiniert | aufnehmen; Spitzenprior, außer bei d1 | Spitzenprior wie bisher | keine Änderung |

**Prior-Rechnung und alle Ausnahmen bleiben exakt wie in Stufe 1** (`kandidaten-orakel.md` §2, §3): P′ mit hi,
lo und T der 16 Basiskinder; Spitzenprior gleichauf mit dem größten anderen Prior und Normierung; Vergleich
R(c) ≥ M ohne Toleranz; entartete Rechnung ohne Eingriff. Insbesondere:

- **d1** (der aufgenommene Zug hätte für *g* **oder** den Rang-Nachbarn *n* schon mit natürlichem Prior den
  größten): Aufnahme bleibt, nur die Anhebung entfällt. In N ist das ohnehin die Aufnahme ohne Anhebung.
- **Vom Rang-Nachbarn abhängige Ausschlüsse bleiben**, obwohl kein Arm den Nachbarn einsetzt: kein Eingriff,
  wenn es keinen zulässigen Nachbarn gibt (c0, d0), und kein Eingriff in Fall c, wenn *g* oder *n* schon den
  größten Prior hat (c1). Sonst wäre S ein anderer Eingriff als in Stufe 1.

Daraus folgt Stelle für Stelle: **S = N in den Fällen d und d1, ergänzt um die Anhebung außer bei d1, und S =
P in Fall c.** Das prüfen die Tests (§8) an identischen, gebauten Stellungen und an Archivstellungen; zusätzlich
muss **S bitgleich zum S von Stufe 1** bleiben (gleiche Kinder, gleiche Priors in allen Testfällen).

## 3. Vergleiche

Drei vorab festgelegte **Hauptvergleiche**, jeweils gegen beide Gegner (sechs Tests):

| Vergleich | beantwortet |
|---|---|
| **N − A** | Hilft die Aufnahme fehlender Orakelzüge mit natürlichem Prior? |
| **S − N** | Bringt die Prior-Anhebung zusätzlich zur Aufnahme einen Gewinn? |
| **P − A** | Hilft die Prior-Anhebung allein bei bereits enthaltenen Orakelzügen? |

**Grenze:** S − N umfasst die Anhebung **neu aufgenommener und bereits vorhandener** Kinder; P − A nur
bereits vorhandene. Die beiden Effekte dürfen **nicht** voneinander abgezogen und als isolierter
Gewichtungseffekt neuer Kinder ausgegeben werden.

**Additivität der Mittelwerte:** Weil alle Vergleiche dieselben vollständigen Vierergruppen verwenden, gilt für
die mittleren Endstände exakt (N − A) + (S − N) = S − A. Daraus folgt **keine** Zerlegung in unabhängige
Mechanismen und keine übertragbaren Anteile von Aufnahme und Gewicht: Jeder Eingriff ändert den weiteren
Partieverlauf und damit, welche Stellungen überhaupt vorkommen, und S − N misst die Anhebung in Partien, die
schon durch die Aufnahme verändert sind.

**Ergänzend, ohne Signifikanzurteil (95 %):** S − A als **Replikation** von Stufe 1 mit neuen Seeds; S − P
beschreibend; alles auch nach Farbe der KI.

A und S spielen **neu** mit. Das Ergebnis von Stufe 1 hat die Wahl dieses Anschlussversuchs beeinflusst;
neue Partien geben eine unabhängige Bestätigung. Die alten Daten bleiben Vergleichsmaterial und gehen in keinen
Test ein.

## 4. Bedingungen und Umfang

- **480 gepaarte Partien je Arm und Gegner**, Nummern 1 bis 480, in allen vier Armen dieselben Nummern und
  Seeds: 4 × 480 × 2 = **3840 Partien**, zuzüglich Kontrollen (§7).
- Gegner GNU Go Stufe 1 und **Fuego mit 100 Spielen je Zug**; GNU Go Stufe 1 zählt (Fläche).
- `mctsFixedSims` 120, ohne Vorgabe, Komi 7,5, Aufgabe aus. Farbe nach der Nummer (gerade = KI Schwarz),
  beide Farben gleich häufig.
- Eingriffe ab Zug 81 (`mc` ≥ 80); Pass, Endspiel-Netz, Krisenkandidaten und Baumübernahme (`wurzelFrisch`)
  wie in Stufe 1. Orakel GNU Go Stufe 10, vor der Suche gefragt, eigener Zufallsstrom.
- **Neue Seeds, hier vorab eingetragen** (bisher in keinem Dokument genannt): **233** technische Probe,
  **234** Hauptlauf gegen GNU Go, **235** Hauptlauf gegen Fuego.

## 5. Endpunkte, Tests und Genauigkeit

- **Primärer Endpunkt:** Differenz des Endstands, gepaart nach Partienummer, für N − A, S − N und P − A, je
  Gegner. Zweiseitiger gepaarter t-Test.
- **Fehlerniveau:** sechs Haupttests, Bonferroni: α = 0,05 / 6 ≈ 0,0083 je Test, Intervalle zu **99,17 %**.
  Alles andere ist beschreibend mit 95-%-Intervallen und trägt kein Fehlerniveau.
- **Vollständige Vierergruppen:** Alle Vergleiche verwenden nur Partienummern, die in **allen vier Armen** eines
  Gegners ausgewertet sind. Ausfälle stehen je Gegner, Arm und Farbe mit Grund im Bericht, wie in Stufe 1.

**Planung** (t-Quantil 2,649 bei 479 Freiheitsgraden; Teststärke 80 %):

| Gegner | angenommene SD der Paardifferenz | halbe Intervallbreite (99,17 %) | MDE₈₀ |
|---|---:|---:|---:|
| GNU Go | 59 | 7,1 | 9,4 |
| Fuego (100 Spiele) | 85 | 10,3 | 13,5 |

Die Planungswerte sind die vorsichtigen aus Stufe 1. Gemessen wurde dort für S − A eine SD von 46,6 (GNU Go)
und 58,0 (Fuego); damit wären es 5,6 / 7,4 und 7,0 / 9,2 Punkte. Die Streuungen von N − A, S − N und P − A
sind **unbekannt**. Die Zahlen sind Planung, keine zugesicherte Genauigkeit.

## 6. Lesart (vorab)

- **N − A positiv:** Bessere Kandidatenaufnahme ist schon ohne Spitzenprior nutzbar.
- **S − N positiv:** Die zusätzliche Gewichtung trägt zum Gewinn bei.
- **P − A positiv:** Auch die Gewichtung bereits verfügbarer Züge bietet Verbesserungsspielraum.
- **Negativ signifikant:** Der jeweilige Eingriff schadet unter diesen Bedingungen; berichtet wie ein positives
  Ergebnis, mit Intervall.
- **Kein nachgewiesener Unterschied:** Intervall und Obergrenze berichten („kein nachgewiesener Gewinn über +U
  Punkte“); weder Wirkungslosigkeit noch Gleichwertigkeit behaupten.

Für alle Ergebnisse gelten die Grenzen aus `kandidaten-orakel.md` §6 und §13: 120 Simulationen statt 750 bis
1300 im Browser; das Orakel steht im Spiel nicht zur Verfügung; die Verwandtschaft von Orakel, Netz, Mustern
und Schiedsrichter (alle GNU Go) bleibt eine mögliche Erklärung (Hypothese). Keine Folge für das Spiel ohne
eigene Vorabfestlegung.

## 7. Gültigkeit

Zwei Zustände, wie in Stufe 1. **Ungültig** („KEIN URTEIL“, Lauf rot, **kein** Effekt im Bericht), wenn eine
Bedingung fehlschlägt. Übernommen aus `kandidaten-orakel.md` §9 und §12:

1. Je Arm und Gegner liegt jede Nummer 1 bis 480 genau einmal vor; gleich viele gespielte Partien je Farbe.
2. Je Arm und Gegner mindestens 471 von 480 Partien ausgewertet (98 %); das ist die **einzige** Schwelle für
   die Vollständigkeit, keine eigene für vollständige Vierergruppen.
3. Kontrolle: Arm A reproduziert Seed 222, Nr. 1 bis 4, bitgleich.
4. Antwortquote des Orakels ≥ 98 % je Arm und Gegner.
5. Fall d tritt je Gegner in beiden Farben auf.
6. Wiederholungskontrolle: Partien 1 bis 3 je Arm und Gegner beim zweiten Spielen identisch (24 Partien).
7. Zählersummen stimmen (ein Eintrag je Abfrage, eine Abfrage je KI-Zug ab Zug 81, Fälle bekannt).
8. Prior-Summe zur Laufzeit: jeder Eingriff mit Summe, Abweichung ≤ 10⁻⁹; Fehlerprotokoll im Bericht.
9. Gleicher Stand der Quellen in allen Paketen.

**Angepasst an vier Arme (Vorschlag zur Entscheidung):**

10. **Erste Auslösestelle gleich in allen vier Armen.** Bis zum ersten Auslöser (Fall c, d oder d1) greift kein
    Arm ein, die Partien sind bis dahin in allen Armen identisch. Verlangt wird deshalb je Partienummer: gleiche
    Züge bis zur ersten Auslösestelle, also identische Stellung vor dem Eingriff, und dort in A, N, P und S
    dieselbe **Zugnummer**, derselbe **Orakelzug** *g*, derselbe Fall und derselbe Rang von *g* und *n*. Der
    anschließend von der KI **gespielte** Zug darf sich zwischen den Armen unterscheiden; genau das untersucht
    der Versuch. Das ersetzt die Bedingung „erster Auslöser S = ZS“ von Stufe 1. **Danach** müssen die Arme
    nicht mehr dieselben Eingriffe auslösen, weil die Partien auseinanderlaufen.
11. **Eingriffsart je Arm stimmt** (im Lauf geprüft, an jedem Protokolleintrag): A nie aufgenommen und nie
    angehoben; N nur in d und d1 aufgenommen, nie angehoben; P nur in c angehoben, nie aufgenommen; S in d und d1
    aufgenommen, in c und d angehoben, in d1 nicht. Jede Abweichung macht den Lauf ungültig.

Die vorgesehenen Unterschiede der Arme an **identischen** Stellungen prüfen die Tests (§8); Bedingung 10 und
11 sichern im Lauf, dass jeder Arm nur seinen Eingriff ausführt.

## 8. Protokoll und Umsetzung (nach eigenem Go)

**Engine (`index.html`, nur Messpfad, Schalter aus bitgleich):** `extra.kandidatenOrakel.arm` kennt zusätzlich
`N` und `P`. Die Fallbestimmung bleibt für alle Arme dieselbe Funktion; nur die Ausführung hängt am Arm. Neues
Protokollfeld: **endgültiger Prior des Orakelzugs** (`pEnd`), wenn er Kind ist (in N bei Aufnahme gleich dem
natürlichen, in P und S nach der Anhebung). Der natürliche Prior (`pG`) und die Besuche (`besuche.g`) stehen
schon im Protokoll.

**Harness:** `--kandidaten-orakel A|N|P|S|ZS`; das Protokoll übernimmt `pEnd`.

**Bericht, zusätzlich getrennt nach „Orakelzug schon Kind“ (Fall c) und „neu aufgenommen“ (Fall d, d1), je Arm,
Farbe und Spielphase (Zug 81 bis 160, 161 bis 240, ab 241):**

- natürlicher und endgültiger Prior des Orakelzugs (Median, Quartile);
- Anteil mit Aufnahme und mit tatsächlicher Anhebung;
- Besuche des Orakelzugs, **einschließlich des Anteils mit null Besuchen**; in A und P bei Fall d ist er kein
  Kind und hat keine Besuche (eigene Zeile);
- Anteil, in dem der Orakelzug gespielt wird.

Diese Zahlen helfen beim Verstehen; sie ersetzen **keinen** kausalen Vergleich der Arme.

**Tests (Pflicht vor jedem Lauf, im Job „Prüfen“):** Arm A und alle Fälle ohne Eingriff bitgleich zum Default;
S bitgleich zum S von Stufe 1; N und P je Fall gegen die Tabelle in §2 (gebaute Listen, Randfälle d1, gleiche
Scores, gleicher Prior, c0, d0, e); Stelle für Stelle S = N in d/d1 plus Anhebung und S = P in c; Prior-Summe
1; `pEnd` gleich dem Prior des Kindes; Replay einer Archivpartie für beide Farben; Bericht mit gebauten Daten
(jede Verletzung von §7 → KEIN URTEIL ohne Effekt); Workflow nur von Hand.

## 9. Technische Probe (Stufe 0, vor dem Hauptlauf, eigenes Go)

- Seed **233**, Arme A, N, P, S, je **8 Partien gegen GNU Go und 4 gegen Fuego** (je Farbe gleich viele): 48
  Partien. Dazu die Kontrolle Seed 222, Nr. 1 bis 4.
- Ausgewertet werden nur Technik und Laufzeit: Bedingungen 3, 4, 5, 7, 8, 10, 11 aus §7, Dauer je Partie und
  je Paket, Fallanteile je Farbe, Anteile von Aufnahme und Anhebung je Arm.
- **Nicht** ausgewertet: Höhe der Endstand-Unterschiede. Sie gehen in keine Anpassung des Versuchs ein.

## 10. Aufwand

- Stufe 1 brauchte für drei Arme **65,0 h Partiezeit** (A 8,2 / 11,4 h, S 8,6 / 12,9 h, ZS 9,4 / 14,5 h; GNU
  Go / Fuego) und **3 h 39 min** Wanduhrzeit. A und S zusammen: 41,1 h. Für N und P ist die Dauer unbekannt;
  nimmt man je den langsamsten Arm von Stufe 1 (ZS, 23,9 h), ergeben sich rund **89 h**. Die reine Skalierung
  von 65 h auf vier Arme ergibt rund 87 h.
- Die vorsichtige Rechnung aus Stufe 1 (Maximum plus 50 %) skaliert auf rund **213 Runnerstunden**.
  Vorgeschlagenes **Planungsbudget: rund 220 Runnerstunden**, keine garantierte Obergrenze. Hinweis aus
  Stufe 1: Die längste Einzelpartie (351 s) lag über dem Maximum der Probe (172 s), die Summe aber weit unter
  der vorsichtigen Rechnung. Pakete zu 20 Fuego-Partien bleiben auch mit 351 s je Partie (117 min) unter dem
  Schrittlimit von 240 min.
- Workflow: Aufbau von `kandidaten-orakel-haupt.yml` wiederverwendet (Prüfen als Tor, Pakete zu 30 bzw. 20,
  eine Partie je Prozess, Sicherung nach jeder Partie, Fortsetzen ohne erneutes Rechnen, Begleitdateien,
  Ergebnisbranch nur bei vollständigen Daten). 4 × 16 + 4 × 24 = 160 Paketjobs.

## 11. Ablauf und offene Entscheidungen

1. Diese Vorabfestlegung lesen und mergen (sie enthält Vorgaben).
2. **Go für die Umsetzung**: Engine (N, P, `pEnd`), Harness, Bericht, Probe- und Hauptlauf-Workflow, Tests; als PR.
3. **Go für die technische Probe** (Seed 233).
4. Nachtrag mit Probe und endgültigem Budget; **Go für den Hauptlauf** (Seeds 234, 235).

Zur Entscheidung durch Hazeberry in diesem Entwurf: Bedingungen 10 und 11 (§7), die Einteilung der Spielphasen
im Protokoll (§8) und das Planungsbudget (§10).

## 12. Umsetzung (Go von Hazeberry, 03.11.2026; nicht gelaufen)

- **Engine (`index.html`, nur Messpfad):** `_mctsKidsOrakelKern` kennt die Arme `N` und `P`. Die
  Fallbestimmung ist für alle Arme dieselbe; N kehrt in Fall c unverändert zurück und nimmt in d und d1 mit dem
  natürlichen Prior P′ auf, ohne anzuheben; P kehrt in d und d1 unverändert zurück und hebt in c an wie S. A, S
  und ZS sollen unverändert bleiben; Ergebnis des Engine-Vergleichs siehe unten (Nachtrag).
- **Harness (`gnugo-duell.js`):** `--kandidaten-orakel A|N|P|S|ZS`; Protokollfeld `pE`.
- **Pakete und Zusammenführen:** `paket.js` und `zusammenfuehren.js` kennen N und P.
- **Bericht:** `auswertung/kandidaten-orakel/vierarm-bericht.js`, mit `--probe` für §9 (ohne
  Endstand-Unterschiede). Prüft §7 Punkt 1 bis 11 (9 über `zusammenfuehren.js`); Hauptvergleiche mit
  α = 0,05/6; Additivität der Mittelwerte als Zeile; Protokoll getrennt nach c und d/d1, Farbe und Phase.
- **Protokoll je Farbe und Spielphase:** natürlicher und endgültiger Prior (Median, Quartile), Aufnahme,
  Anhebung, Anteil Kind, null Besuche, Besuche (Median, Quartile) und gespielt, getrennt nach Fall c und d/d1.
- **Prüfungen und Ausfälle im Bericht (Vorgabe Hazeberry, 03.11.2026):** Der Bericht führt jede technische
  Prüfung als eigene Zeile mit geprüften und **nicht prüfbaren** Einheiten und dem Ergebnis; „bestanden“ gilt
  nur für die geprüften Einheiten. **Zulässige Partieausfälle** (abgebrochene Partien) stehen in einem eigenen
  Abschnitt und nie unter „bestanden“; im Hauptlauf zählen sie gegen die 98 % je Arm. Eine nicht abgebrochene
  Partie ohne Protokoll des Orakels oder ohne Endstand ist **kein** zulässiger Ausfall, sondern ein technischer
  Fehler (Prüfung P „Pflichtprotokoll“) und ergibt **KEIN URTEIL**, in der Probe wie im Hauptlauf.
  Vierergruppen mit einem zulässigen Ausfall sind für Prüfung 10 nicht prüfbar und werden mit Nummer genannt;
  gibt es je Gegner keine prüfbare Gruppe, ist der Lauf ungültig. In der Wiederholungskontrolle zählt eine nicht
  prüfbare Partie wie bisher als nicht bestanden.
- **Workflows (nur von Hand):** `kandidaten-orakel-vierarm-probe.yml` (Seed 233, 4 × 8 + 4 × 4 Partien,
  Kontrolle) und `kandidaten-orakel-vierarm.yml` (Seeds 234 und 235, 4 × 16 und 4 × 24 Pakete, Wiederholung,
  Kontrolle), Aufbau wie `kandidaten-orakel-haupt.yml`.
- **Tests:** `tests/kandidaten-orakel-vierarm.js` (Job „Prüfen“ in beiden Workflows).

**Nicht gestartet:** weder Probe noch Hauptlauf. Beide brauchen ein eigenes Go.

### Nachtrag: Engine-Vergleich A, S, ZS (Lauf 41617738140)

**Start:** Der Lauf wurde von mir ohne ausdrückliches Go von Hazeberry gestartet (eine Empfehlung als Go
gelesen). Hazeberry hat ihn durchlaufen lassen; das ist **keine** nachträgliche Billigung des Starts.

**Quelle:** Workflow `engine-vergleich.yml`, Lauf 41617738140 (Workflow-Stand `f87f148`), je Stand ein eigener
Job. alt = `370df8e317f5919f92837563fd5aaf553bf39789` (Stand Stufe 1), neu =
`e0de66f8f2f74257155557df9da928f75eb8b681` (Kopf dieses PR; `index.html` seitdem unverändert). Bericht unverändert
unter `docs/daten/kandidaten-orakel/engine-vergleich-41617738140/bericht.md`.

**Ergebnis: GLEICH.** 26 Replays (Archivpartien 1 und 2, Seed 222, bis Zug 130; Default und Arme A, S, ZS mit dem
Orakelzug auf Rang 5, 16, 17 oder 30), 1328 KI-Abfragen, alle mit Wurzelkindern. Gewählter Zug, Wurzelkinder,
Priors je Wurzelkind und die Protokollfelder (Fall, Ränge, natürliche Priors, Aufnahme, Anhebung, Kinderzahl,
Prior-Summe) sind in beiden Ständen identisch; alle Priors vorhanden und endlich; keine nicht prüfbaren Läufe.

**Abdeckung und Grenzen:**

| Arm | Läufe | Abfragen ab Zug 81 | Fälle |
|---|---:|---:|---|
| A | 8 | 200 | c 97, c1 3, d 100 |
| S | 8 | 22 | c 10, c1 1, d 11 |
| ZS | 8 | 16 | c 10, c1 1, d 5 |

- Das Nachspielen folgt dem Archiv und fragt die KI nur bis zu ihrer ersten Abweichung vom Archivzug. Mit Eingriff
  (S, ZS) weicht die KI schnell ab (je Lauf 1 bis 7 Abfragen ab Zug 81). Für S und ZS beruht die Gleichheit
  deshalb auf **22 und 16** Eingriffsstellen, für ZS darunter nur **5** mit Fall d.
- **Fall d1 kam nicht vor**, ebenso nicht die entartete Rechnung (e) und c0/d0; für diese Fälle belegt der
  Vergleich nichts. Sie sind nur durch die Tests an gebauten Listen abgedeckt.
- Verglichen sind nur A, S und ZS; die neuen Arme N und P haben keinen alten Stand. Sie sind durch die Tests
  (§8) und im Lauf durch die Prüfungen 10 und 11 abgesichert.

## 13. Nachtrag: technische Probe (Lauf 41623472366)

**Quelle:** Workflow `kandidaten-orakel-vierarm-probe.yml`, Lauf 41623472366 (Stand `bd93a21`), gestartet
03.11.2026 10:56 UTC nach ausdrücklichem Go von Hazeberry, ein Durchgang. Bericht, Auswertung, Begleitdateien und
Rohdaten unverändert aus `ergebnisse/kandidaten-orakel-vierarm-probe-lauf1` (Commit `331988e`) unter
`docs/daten/kandidaten-orakel/vierarm-probe-lauf1/`. Die Zahlen unten stammen aus diesem Bericht; im Container
wurde nichts nachgerechnet.

Die Probe sagt **nichts** über die Wirkung (§9). Endstand-Unterschiede gibt der Bericht festgelegt nicht aus.

### Technische Prüfungen: gültig

| Prüfung | geprüft | Ergebnis |
|---|---|---|
| 1 Vollständigkeit (Seed 233, je Arm 8 Partien gegen GNU Go und 4 gegen Fuego) | 48 Partien | bestanden |
| P Pflichtprotokoll und Endstand | 48 Partien | bestanden |
| 3 Kontrolle Arm A gegen Archiv (Seed 222, Nr. 1 bis 4) | 4 Partien | bitgleich |
| 4 Antwortquote des Orakels je Arm und Gegner | 6167 Abfragen | 100 % in allen acht |
| 5 Fall d in beiden Farben | 48 Partien | GNU Go 459 / 753, Fuego 451 / 515 |
| 7 Zählersummen | 48 Partien | bestanden |
| 8 Prior-Summe je Eingriff | 6113 Einträge | größte Abweichung 6,7 · 10⁻¹⁶, Fehlerprotokoll leer |
| 10 erste Auslösestelle in allen vier Armen gleich | 12 Vierergruppen | 0 abweichend |
| 11 Eingriffsart je Arm | 6167 Einträge | 0 Abweichungen |

Keine zulässigen Partieausfälle, keine nicht prüfbaren Einheiten. Fall d1 trat auf (GNU Go 6, Fuego 2), die
entartete Rechnung (e) nicht.

**Arme wie vorgesehen** (Anteile an den Auslösestellen des jeweiligen Arms): N nimmt neue Orakelzüge zu 100 % auf
und hebt nie an; P hebt vorhandene Kinder zu 100 % an und nimmt nie auf; S hebt in Fall c zu 100 % an und nimmt
neue Orakelzüge zu 100 % auf, angehoben zu 100 % (GNU Go) bzw. 99,6 % (Fuego); die fehlenden 0,4 % sind
d1-Stellen, an denen die Anhebung festgelegt entfällt. Pässe vor der Suche (`kein-protokoll`): 4 bis 9 je Arm,
davon nur in Fuego Arm A zweimal mit einem Zug des Orakels.

### Laufzeit

- Wanduhrzeit rund 13 Minuten (10:56 bis 11:09 UTC); Partiezeit zusammen 1,1 h.
- Dauer je Partie, Median / Maximum: GNU Go 56,5 bis 67,7 s / höchstens 93,6 s; Fuego 98,8 bis 115,9 s /
  höchstens 170,2 s.
- **Hochrechnung Hauptlauf** (3840 Partien): aus dem Maximum plus 50 % GNU Go 74,9 h, Fuego 136,2 h, zusammen
  **211 h**, dazu rund 1,5 h für Wiederholung und Kontrolle; unter dem Planungsbudget von rund 220 h, mit wenig
  Abstand. Aus den Medianen rund **91 h**, verträglich mit Stufe 1 (65 h für drei Arme).
- In Stufe 1 lag die längste Einzelpartie (351 s) über dem Maximum der Probe (172 s). Ein Fuego-Paket mit 20
  solchen Partien bräuchte 117 Minuten und bliebe unter dem Schrittlimit von 240 Minuten.

### Folge

Aus der Probe ergibt sich kein technischer Einwand gegen den Hauptlauf. Umfang und Auswertung bleiben wie in §4,
§5 und §7 festgelegt. Der Hauptlauf (Seeds 234 und 235) startet erst nach eigenem, ausdrücklichem Go.

## 14. Nachtrag: Ergebnis des Hauptlaufs (Lauf 41627980348)

**Quelle:** Workflow `kandidaten-orakel-vierarm.yml`, Lauf 41627980348, Commit
`8740574aa6f3d572b1d234d58202008d71404fb2`, gestartet 03.11.2026 11:29 UTC nach ausdrücklichem Go von Hazeberry,
ein Durchgang ohne Fortsetzen. Bericht, Auswertung, Begleitdateien und Rohdaten unverändert aus
`ergebnisse/kandidaten-orakel-vierarm-lauf1` (Commit `145ea20`) unter `docs/daten/kandidaten-orakel/vierarm-lauf1/`.
Alle Zahlen stammen aus diesem Bericht; im Container wurde nichts nachgerechnet oder nachgespielt.

### Gültigkeit

**Gültig.** Alle technischen Prüfungen aus §7 bestanden:

| Prüfung | geprüft | nicht prüfbar | Ergebnis |
|---|---|---|---|
| 1 Vollständigkeit | 3840 Partien | – | bestanden |
| P Pflichtprotokoll und Endstand | 3836 Partien | 4 (zulässiger Ausfall) | bestanden |
| 2 ≥ 98 % je Arm und Gegner ausgewertet | 8 Arme | – | bestanden (je 479 bzw. 480 von 480) |
| 3 Kontrolle Seed 222, Nr. 1 bis 4 | 4 Partien | – | bitgleich |
| 4 Antwortquote je Arm und Gegner | 514 616 Abfragen | – | 100 % in allen acht |
| 5 Fall d in beiden Farben | 3836 Partien | 4 | bestanden |
| 6 Wiederholungskontrolle | 24 Partienpaare | – | identisch |
| 7 Zählersummen | 3836 Partien | 4 | bestanden |
| 8 Prior-Summe je Eingriff | 508 984 Einträge | 4 Partien | größte Abweichung 8,9 · 10⁻¹⁶, Fehlerprotokoll leer |
| 10 erste Auslösestelle in allen vier Armen gleich | 959 Vierergruppen | 1 (g127) | 0 abweichend |
| 11 Eingriffsart je Arm | 514 616 Einträge | 4 Partien | 0 Abweichungen |

**Zulässige Partieausfälle:** 4, alle gegen GNU Go, alle Partie Nr. 127 (KI Weiß), in **allen vier Armen**: Absturz
des Gegners GNU Go (SIGSEGV bei `genmove B`). Dass derselbe Absturz in allen vier Armen auftritt, deutet auf eine
Stellung vor dem ersten Eingriff, an der GNU Go 3.8 abstürzt; das ist eine **Hypothese**, nicht geprüft. Damit
**479 vollständige Vierergruppen** gegen GNU Go, **480** gegen Fuego. Alle Vergleiche beruhen auf diesen Gruppen.

### Hauptvergleiche (α = 0,05/6 je Test, Intervall 99,17 %)

| Gegner | Vergleich | verwendete Paare | Differenz [99,17 %] | SD | p | Urteil |
|---|---|---:|---|---:|---:|---|
| GNU Go | N − A | 479 | +0,7 [−5,2; +6,6] | 49,0 | 0,76 | kein nachgewiesener Unterschied |
| GNU Go | S − N | 479 | **+26,3** [+19,9; +32,6] | 52,2 | 2,9 · 10⁻²⁵ | S besser als N |
| GNU Go | P − A | 479 | **+13,8** [+8,2; +19,5] | 46,8 | 2,5 · 10⁻¹⁰ | P besser als A |
| Fuego (100 Spiele je Zug) | N − A | 480 | −0,9 [−6,9; +5,1] | 49,5 | 0,69 | kein nachgewiesener Unterschied |
| Fuego (100 Spiele je Zug) | S − N | 480 | **+30,4** [+23,3; +37,5] | 58,7 | 1,6 · 10⁻²⁶ | S besser als N |
| Fuego (100 Spiele je Zug) | P − A | 480 | **+11,7** [+5,5; +18,0] | 51,7 | 9,1 · 10⁻⁷ | P besser als A |

Die gemessenen SD (46,8 bis 58,7) liegen unter den Planungswerten 59 und 85; die Intervalle sind schmaler als
geplant.

**Additivität der Mittelwerte** (§3): GNU Go (N − A) +0,7 + (S − N) +26,3 = +26,9 = S − A; Fuego −0,9 + 30,4 = +29,5
= S − A. Daraus folgt keine Zerlegung in unabhängige Mechanismen.

### Lesart (vorab festgelegt, §6)

- **N − A, beide Gegner: kein nachgewiesener Unterschied.** Kein nachgewiesener Gewinn über +6,6 (GNU Go) bzw.
  +5,1 Punkte (Fuego). Das heißt **nicht**, dass die Aufnahme wirkungslos oder gleichwertig ist; Gewinne bis zu
  dieser Obergrenze sind nicht ausgeschlossen, Verluste bis −5,2 bzw. −6,9 ebenso wenig.
- **S − N, beide Gegner: positiv.** Die zusätzliche Gewichtung trägt zum Gewinn bei. S − N umfasst die Anhebung
  neu aufgenommener **und** bereits vorhandener Orakelzüge (§3).
- **P − A, beide Gegner: positiv.** Auch die Gewichtung bereits verfügbarer Orakelzüge bietet
  Verbesserungsspielraum.
- S − N und P − A werden **nicht** voneinander abgezogen; ein isolierter Gewichtungseffekt neu aufgenommener
  Kinder lässt sich daraus nicht ablesen.

### Ergänzend, ohne Signifikanzurteil (95 %)

| Gegner | S − A (Replikation) | S − P | Siege A / N / P / S (vollständige Gruppen) |
|---|---|---|---|
| GNU Go | +26,9 [+22,3; +31,6] | +13,1 [+8,3; +17,9] | 2,1 % / 1,9 % / 6,5 % / 8,8 % |
| Fuego (100 Spiele je Zug) | +29,5 [+24,0; +35,0] | +17,7 [+12,3; +23,2] | 12,9 % / 14,4 % / 22,7 % / 35,0 % |

- **Replikation:** S − A hat mit neuen Seeds dieselbe Richtung und Größenordnung wie in Stufe 1 (+24,7 und +36,0,
  `kandidaten-orakel.md` §13); beschreibend, kein Test.
- Nach Farbe der KI sind S − N, P − A und S − A in allen vier Gruppen positiv; N − A liegt in allen vier Gruppen
  mit dem Intervall um null (Tabellen im Bericht).

### Beschreibend: Protokoll (§8)

- **Neu aufgenommene Orakelzüge in N** bekommen ihren natürlichen Prior (Median 0,017 gegen GNU Go, 0,010 gegen
  Fuego), werden im Median 2- bzw. 1-mal besucht, in 19,4 % bzw. 23,0 % der Stellen gar nicht, und in 1,0 % bzw.
  0,7 % gespielt. In S (angehoben, Median 0,218 bzw. 0,234) sind es 24 bzw. 25 Besuche und 32,3 % bzw. 25,9 %.
- **Bereits vorhandene Orakelzüge** werden in A in 5,6 % bzw. 5,2 % der Stellen gespielt, in P nach der Anhebung
  in 35,9 % bzw. 37,6 %.
- Diese Zahlen beschreiben das Verhalten der Suche; sie ersetzen keinen kausalen Vergleich der Arme.

### Laufzeit

- Wanduhrzeit rund 4 h 40 min (11:29 bis 16:09 UTC); Partiezeit zusammen **83,5 h**, im Bereich der Erwartung aus
  der Probe (rund 91 h) und weit unter dem Planungsbudget von rund 220 h.
- Längste Einzelpartien: GNU Go 199,9 s, **Fuego 1117,8 s** (Arm P) und 1112,3 s (Arm S), also weit über dem
  Maximum der Probe (170,2 s). Kein Paket kam an sein Zeitlimit. Die Ursache der langen Fuego-Partien ist nicht
  untersucht.

### Folge

Keine Folge für das Spiel: Das Orakel ist ein Messmittel. Die Ergebnisse besagen unter den gemessenen Bedingungen
(120 Simulationen, ohne Vorgabe, Zählung durch GNU Go Stufe 1), dass das Anbieten des Orakelzugs mit natürlichem
Prior keinen nachgewiesenen Gewinn bringt, die Prior-Anhebung dagegen schon, auch bei bereits vorhandenen Kindern.
Ob und wie sich das ohne Orakel nutzen lässt, ist eine neue Frage mit eigener Vorabfestlegung. Die Grenzen aus
`kandidaten-orakel.md` §6 und §13 gelten weiter (Verwandtschaft mit GNU Go als Hypothese). Weitere Läufe sind
nicht gestartet.

