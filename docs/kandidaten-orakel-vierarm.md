<!--
Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
-->
# Kandidaten-Orakel, Vierarm-Versuch: Aufnahme und Gewicht getrennt (Vorabfestlegung, Entwurf)

**Stand: Vorabfestlegung gemergt (#270), Umsetzung nach Go von Hazeberry (§12); nichts gelaufen.** Ursprünglich: Entwurf, nichts umgesetzt. Umsetzung (Arme N und P in der Engine, Harness,
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
  und ZS sind unverändert: An den Archivpartien Nr. 1 und 2 (Seed 222, Zug 81 bis 130, Orakelzug auf Rang 5,
  16, 17 oder 30; dabei 117 Stellungen mit Fall c und 116 mit Fall d) gaben die Engine von Stufe 1 (`370df8e`) und
  die neue für A, S und ZS in 24 von 24 Replays dieselben Züge, Kinder und Priors (Vergleich lokal, je Engine
  ein eigener Prozess, nicht im Repo). Neues Protokollfeld `pEnd`: Prior des Orakelzugs unter den fertigen Kindern, sonst `null` (nur lesend).
- **Harness (`gnugo-duell.js`):** `--kandidaten-orakel A|N|P|S|ZS`; Protokollfeld `pE`.
- **Pakete und Zusammenführen:** `paket.js` und `zusammenfuehren.js` kennen N und P.
- **Bericht:** `auswertung/kandidaten-orakel/vierarm-bericht.js`, mit `--probe` für §9 (ohne
  Endstand-Unterschiede). Prüft §7 Punkt 1 bis 11 (9 über `zusammenfuehren.js`); Hauptvergleiche mit
  α = 0,05/6; Additivität der Mittelwerte als Zeile; Protokoll getrennt nach c und d/d1, Farbe und Phase.
- **Workflows (nur von Hand):** `kandidaten-orakel-vierarm-probe.yml` (Seed 233, 4 × 8 + 4 × 4 Partien,
  Kontrolle) und `kandidaten-orakel-vierarm.yml` (Seeds 234 und 235, 4 × 16 und 4 × 24 Pakete, Wiederholung,
  Kontrolle), Aufbau wie `kandidaten-orakel-haupt.yml`.
- **Tests:** `tests/kandidaten-orakel-vierarm.js` (Job „Prüfen“ in beiden Workflows).

**Nicht gestartet:** weder Probe noch Hauptlauf. Beide brauchen ein eigenes Go.

