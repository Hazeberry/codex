<!--
Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
-->
# Kandidaten-Orakel: Bringt GNU Gos Zug als zusätzliches Wurzelkind etwas? (Vorabfestlegung, Entwurf)

**Stand: Entwurf.** Nichts ist umgesetzt, nichts ist gelaufen. Die Umsetzung (ein Messschalter in der
Engine, eine Option im Harness, Workflows, Tests) und **jeder Lauf, auch die Laufzeitprobe**, beginnen
erst nach ausdrücklichem „Go“ von Hazeberry. Dieses Dokument legt vorab fest, was gemessen wird, wie
gelesen wird und was ein Nullergebnis nicht aussagt. Es gibt **keine automatische Folgeentscheidung**.

## 1. Anlass

Die Rang-Auswertung (`docs/diagnose-p2-rang.md` §8) zeigt für Stellungen mit der KI als Schwarz: GNU Gos
Zug (Stufe 10) steht vor dem Netz im Median auf Rang 29 der Kandidatenliste, nur in 34,2 % unter den
16 Wurzelkindern, nach dem Netz in 38,9 %. Ob dieses Fehlen Punkte kostet, sagt keine bisherige Messung:

- Der Orakel-Test (`muster-endspiel-orakel.md`) **erzwang** GNU Gos Zug und fand viel Spielraum
  (+78,7 Punkte bei allen Zügen), unter anderen Bedingungen (neun Vorgabesteine, GNU Go Stufe 1). Er lässt
  offen, ob die Suche den Zug auch **wählen** würde, stünde er zur Wahl.
- Mehr Suche trifft GNU Gos Zug nicht öfter (`punktverlust-muster.md` §6). Das spricht gegen „nur zu wenig
  Rechenzeit“, ist aber keine Antwort auf die Kandidatenfrage.
- Mehr Netzpunkte unter den Kandidaten (`endspielNetzTop` 8) brachte +1,3 [−6,0; +8,6]
  (`netz-dosis.md` §8). Das ändert die Zusammensetzung der 16, nicht ihre Zahl.

Die alten +1,6 Punkte je geändertem Zug aus dem Orakel-Test sind **keine Prognose** für diesen Versuch:
Dort wurde ein Zug erzwungen, hier entscheidet die Suche, unter anderen Bedingungen. Der Aufwand und die
erkennbare Größe werden deshalb aus Messung und Streuung bestimmt (§5, §7), nicht aus dieser Zahl.

**Frage (Stufe 1):** Verbessert es das Spiel, wenn GNU Gos Zug (Orakel) im Endspiel **zusätzlich unter
den Wurzelkindern steht und den Spitzenprior bekommt** (der kombinierte Eingriff S gegen den Default A)?

**Frage (nur Vollentwurf):** Wie viel davon ist die **Aufnahme** des Zuges und wie viel sein
**Prior-Gewicht**? **Stufe 1 beantwortet das ausdrücklich nicht.** Sie prüft nur den kombinierten Eingriff.

## 2. Aufnahme und Gewicht, und die Prior-Rechnung

Ein zusätzlicher Zug mit Spitzenprior verändert **zwei Dinge zugleich**: Er kann überhaupt gesucht werden
(**Aufnahme**), und die Suche bevorzugt ihn (**Gewicht**). Der Vollentwurf trennt beides (Arme N und P),
Stufe 1 tut es nicht (§5).

Vorbild für die Anwendung ist `krisenKandidaten` (der Zug bekommt die Chance, die Suche entscheidet), nicht
der erzwungene Zug des Orakel-Tests. Die Eingriffe wirken an der Wurzel in jedem KI-Zug ab Zug 81
(`mc` ≥ 80, wie das Endspiel-Netz) bis zum Partieende, **nach** dem Endspiel-Netz und den
Krisenkandidaten, auf die frisch gebildeten Wurzelkinder; Statistik aus einem übernommenen Teilbaum
(`wurzelFrisch`) wird wie im Default übernommen.

### Prior-Rechnung, eindeutig

**Bezeichnungen.** *L* ist die Kandidatenliste, wie sie `mctsPUCT` bekommt. *s(m)* ist der Score des Zuges
*m*. *K* = 16 (`mctsRootChildren`). *B* sind die ersten *K* Einträge von *L* (die Basiskinder).
σ = `mctsPriorSharp` (Default 3), λ = `endspielNetz` (Default 0,8), *q(m)* die Netz-Wahrscheinlichkeit von
*m* (0, wenn nicht vorhanden).

**Basisprior (Default, unverändert).** Mit hi = max und lo = min der **endlichen** Scores *s(m)*, *m* ∈ *B*,
ṽ(m) = s(m) für endliches *s(m)*, sonst lo, und *T* = max(10⁻⁶, (hi − lo) / σ):

  w(m) = exp((ṽ(m) − hi) / T),  Z_B = Σ_{m∈B} w(m),  P_B(m) = w(m) / Z_B.

Ist λ > 0 und Σ_{m∈B} q(m) > 0 (Endspiel-Netz an), dann

  P(m) = (1 − λ) · P_B(m) + λ · q(m) / Σ_{m∈B} q(m).

**Aufnahme** eines Zuges *a* ∉ *B* (Fall (d)); die Kinder sind *B′* = *B* ∪ {*a*} (17 Kinder). hi, lo und
*T* bleiben die aus *B* (**nicht** neu gerechnet). Mit ṽ(a) wie oben:

  w(a) = exp((ṽ(a) − hi) / T),  Z′ = Z_B + w(a),  P′_S(m) = w(m) / Z′  für alle m ∈ B′,

und, falls λ > 0 und Σ_{m∈B′} q(m) > 0,

  P′(m) = (1 − λ) · P′_S(m) + λ · q(m) / Σ_{m∈B′} q(m).

Ohne Netz-Anteil ist P′ = P′_S. Es gilt Σ P′ = 1. Die Priors der 16 Basiskinder ändern sich nur durch die
Normierung über 17 statt 16 Kinder (und den Netz-Nenner), nicht durch eine andere Temperatur. Das ist der
**natürliche Prior** des aufgenommenen Zuges.

**Spitzenprior** für ein Kind *c* ∈ *B′* (bei Aufnahme auf P′, sonst auf dem Default-Vektor P über *B*; im
Folgenden *R* für den jeweils geltenden Vektor): *M* = max_{m ≠ c} R(m). Ist R(c) ≥ *M*, gibt es **keinen
Eingriff** (Fall (c1)). Sonst

  R″(c) = M,  R″(m) = R(m) sonst,  R‴(m) = R″(m) / Σ_i R″(i).

Nach der Normierung hat *c* den größten Prior **gleichauf** mit dem bisher größten anderen Kind (nicht
darüber). Alle übrigen PUCT-Größen (Exploration, Simulationszahl, Q-Werte) bleiben unverändert.

**Rechenbeispiel** (zur Anschauung *K* = 3 statt 16, σ = 3, ohne Netz-Anteil; Scores 10, 8, 4 für die
Basiskinder und 2 für den aufgenommenen Zug): hi = 10, lo = 4, *T* = 2. Basisprior: w = (1; 0,3679; 0,0498),
Z_B = 1,4177, P_B = (0,7054; 0,2595; 0,0351). Aufnahme: w(a) = exp(−4) = 0,0183, Z′ = 1,4360,
P′ = (0,6964; 0,2562; 0,0347; 0,0128). Spitzenprior für den aufgenommenen Zug: M = 0,6964,
R″ = (0,6964; 0,2562; 0,0347; 0,6964), Summe 1,6836, R‴ = (0,4136; 0,1522; 0,0206; 0,4136). Der Test in §8
rechnet dieses Beispiel nach.

**Randfälle, ausdrücklich festgelegt.**

- **Gleiche Scores in *B*.** Ist hi = lo, dann *T* = 10⁻⁶ und w(m) = 1 für alle Basiskinder: Der Default-Prior
  ist gleichverteilt (1/16 ohne Netz-Anteil). Beim aufgenommenen Zug gilt dieselbe Formel ohne Sonderfall:
  w(a) = exp((ṽ(a) − hi) / 10⁻⁶) ist 0 (Unterlauf), wenn ṽ(a) < hi, und 1, wenn ṽ(a) = hi. Der natürliche
  Prior eines schlechteren Zusatzzuges ist dann 0 (plus sein Netz-Anteil); der Prior der 16 Basiskinder bleibt
  dann exakt der Default-Prior. Das Protokoll hält w(a) = 0 fest.
- **Gleicher Rang bei gleichem Score.** Der Rang ist die **Position in *L***, so wie `mctsPUCT` die Liste
  bekommt; Gleichstände sind dort vom Motor schon entschieden (einschließlich seines Gleichstandsbrechers).
  Der Eingriff sortiert nicht neu. Der Nachbar ist die Position r ± 1, auch bei gleichem Score.
- **Gleicher Prior beim Vergleich.** Die Bedingung R(c) ≥ M gilt auch bei Gleichheit: Ein Kind, das mit dem
  größten anderen Prior gleichauf liegt, wird **nicht** angehoben. Verglichen wird exakt in
  Gleitkommazahlen, ohne Toleranz.
- **Zusatzkind schon mit dem höchsten Prior (d1).** Das ist möglich, wenn der Netz-Anteil λ · q(a) / Σ q den
  natürlichen Prior über den größten der 16 hebt. Dann bleibt die Aufnahme, die Anhebung entfällt. Damit die
  Priorbehandlung in S und ZS gleich bleibt, entfällt sie in **beiden** Armen, wenn sie für *g* **oder** für
  *n* entfiele (die Entscheidung nutzt beide Vektoren, P′ mit *g* und P′ mit *n*); das Protokoll nennt Fall (d1)
  und beide natürlichen Priors.

**Entartete Fälle.** Fällt die Default-Rechnung auf den Rang-Prior zurück (σ = 0, nur ein Kind, Z_B nicht
endlich oder ≤ 0), gibt es in diesem Zug **keinen Eingriff** in keinem Arm; die Stellung wird gezählt.

### Fälle je KI-Zug

*L* ist die Kandidatenliste nach dem Netz und den Krisenkandidaten, sortiert; die ersten 16 sind die
Kinder. *g* ist der Zug des Orakels (GNU Go Stufe 10, `reg_genmove`, vor der Suche der KI für dieselbe
Stellung abgefragt), *r* sein Rang in *L*.

| Fall | Bedingung | Bedeutung |
|---|---|---|
| (a) | *g* ist Pass | kein Eingriff in **keinem** Arm |
| (b) | *g* steht nicht in *L* (r = 0; auch z. B. für die KI verbotener Ko-Zug) | kein Eingriff in **keinem** Arm |
| (c) | 1 ≤ r ≤ 16, *g* ist schon Kind | Aufnahme gibt es nichts zu tun; Gewicht kann angehoben werden |
| (c1) | *g* hat schon den größten Prior (oder, für die Kontrollen, der Nachbar *n*): R(c) ≥ M | in keinem Arm ein Eingriff in diesem Fall |
| (d) | r > 16, *g* steht in *L* | Aufnahme als 17. Kind; Anhebung auf den Spitzenprior nur, wenn (d1) nicht vorliegt |
| (d1) | im Fall (d) hat der aufgenommene Zug **schon mit seinem natürlichen Prior** den größten Prior (R(c) ≥ M), für *g* **oder** für den Nachbarn *n* | Aufnahme **ohne** Anhebung, in S **und** ZS |

Nach P2 (nur Schwarz, andere Bedingungen, **keine Prognose**) wäre zu erwarten: (c) rund 39 %, (d) rund
60 %, (b) unter 1 %, (a) rund 1 %. Die Probe misst die tatsächlichen Anteile, beide Farben getrennt.

## 3. Arme und Kontrollen

Gleicher Auslöser, gleiche Kinderzahl, gleiche Priorbehandlung. Die **Kontrolle** unterscheidet sich vom
Eingriffsarm **nur** im gewählten Zug: statt *g* wird der **Rang-Nachbar** *n* genommen.

**Rang-Nachbar:** In (d): *n* = *L*[r+1] (der nächst schlechtere Zug), ist *g* der letzte Eintrag, dann
*L*[r−1]; liegt *n* dabei unter den ersten 16, gibt es keinen zulässigen Nachbarn. In (c): *n* = *L*[r+1],
bei r = 16 *L*[15]. *n* ist immer ein anderer Zug als *g*. Über eine **Ähnlichkeit** des Nachbarn mit dem
Orakelzug (im Prior, im Score oder in der Lage) wird **nichts vorausgesetzt**; das Protokoll hält beide
natürlichen Priors fest, damit die Abweichung nachträglich beschrieben werden kann. Gibt es keinen zulässigen
Nachbarn, oder hat im Fall (c) *g* oder *n* schon den größten Prior, macht **auch der Eingriffsarm nichts**
(so bleibt der Auslöser gleich) und die Stellung wird gezählt. Im Fall (d1) wird in beiden Armen aufgenommen
und in keinem angehoben.

| Arm | Fall (d), r > 16 (ohne (d1)) | Fall (c), 1 ≤ r ≤ 16, weder *g* noch *n* hat den größten Prior | (a), (b), (c1); bei (d1) nur Aufnahme |
|---|---|---|---|
| **A** (Default) | nichts | nichts | nichts |
| **N** (Aufnahme) | *g* als 17. Kind, natürlicher Prior | nichts | nichts |
| **ZN** | *n* als 17. Kind, natürlicher Prior | nichts | nichts |
| **P** (Gewicht) | nichts | Spitzenprior für *g* | nichts |
| **ZP** | nichts | Spitzenprior für *n* | nichts |
| **S** (Aufnahme + Gewicht) | *g* als 17. Kind, Spitzenprior | Spitzenprior für *g* | nichts |
| **ZS** | *n* als 17. Kind, Spitzenprior | Spitzenprior für *n* | nichts |

Damit gilt: In allen Armen mit Eingriff wächst die Kinderzahl in denselben Stellungen um genau eins
(Fall (d)), ein Spitzenprior wird in denselben Stellungen vergeben (Fall (c) und (d) bei S und ZS, ausgenommen
(c1) und (d1), wo er in beiden Armen entfällt), und was sich zwischen Arm und Kontrolle unterscheidet, ist
allein die Identität des Zuges.

**Was die Vergleiche aussagen:**

- **S − A (Hauptvergleich, Stufe 1):** Gesamtwirkung des kombinierten Eingriffs im Spiel: Der Orakelzug wird
  als Kind aufgenommen und bekommt den Spitzenprior (bei schon vorhandenem Orakelzug nur den Spitzenprior).
  Darin stecken **alle** Folgen des Eingriffs, auch Verdünnung der 120 Simulationen auf mehr Kinder und
  Rauschen eines Spitzenzuges. Sie werden **nicht** herausgerechnet.
- **S − ZS (ergänzende Kontrolle, Stufe 1):** Unterschied zwischen dem **Orakelzug** und seinem
  **Rang-Nachbarn** bei gleicher Eingriffsart. ZS ist **kein neutraler Platzhalter**: Der Nachbar kann ein
  guter oder schlechter Zug sein, seine Wirkung und seine Kosten sind nicht die „des Eingriffs ohne
  Information“. S − ZS sagt deshalb nur, ob der Orakelzug sich vom Nachbarn unterscheidet; er sagt nicht,
  wie viel der Eingriffskosten abgezogen wurden. ZS − A beschreibt, was derselbe Eingriff mit dem Nachbarn
  bewirkt, und ist beschreibend.
- **N − ZN** und **P − ZP** (nur Vollentwurf): Aufnahme allein beziehungsweise Gewicht allein, jeweils gegen
  den Nachbarn. Es sind getrennte Messungen von Teilen des Eingriffs, **keine Summanden** von S − ZS.

**Stufe 1 prüft ausdrücklich nur den kombinierten Eingriff** (Arme A, S, ZS). Aussagen über Aufnahme allein
oder Gewicht allein macht sie nicht; N, ZN, P, ZP gehören nicht zu Stufe 1.

## 4. Bedingungen und Protokoll

Standardbedingungen (`CLAUDE.md`): `mctsFixedSims` 120, Aufgabe aus, Komi 7,5, **ohne Vorgabe**, GNU Go
Stufe 1 als Schiedsrichter (Fläche). Gegner: GNU Go (Stufe 1, „g“) und Fuego (100 Spiele, „f“). Die Arme
spielen **dieselben Partienummern** mit demselben Seed (gepaart); die Farbe wechselt mit der Nummer (gerade
= KI Schwarz, ungerade = KI Weiß). **Beide Farben werden gespielt und getrennt protokolliert.** Die
Auswahlregel von P2 (nur gerade Nummern) wird nicht wiederholt: Es werden **alle** Nummern 1 bis *n*
gespielt.

Seeds (bisher in keinem Dokument genannt): **230** (Probe), **231** (Hauptversuch gegen GNU Go), **232**
(Hauptversuch gegen Fuego). Das Orakel ist ein zweites GNU Go auf Stufe 10 mit eigenem Zufallsstrom
(Seed + 60000 wie im Orakel-Test), das jeden Zug mitspielt; es wird **vor** der Suche der KI abgefragt
und ändert deren Zufallsstrom nicht.

**Protokoll je KI-Zug ab Zug 81** (kompakt, keine ganzen Listen): `mc`, Farbe der KI, *g*, Fall, *r* (Rang
in *L*), ob *g* schon Kind war, gewählter Nachbar *n* und sein Rang, die natürlichen Priors von *g* und *n*
(bei Aufnahme P′, sonst P), ob angehoben wurde, aufgenommen ja/nein, gespielter Zug,
Rang des gespielten Zugs in *L*, ob der gespielte Zug *g* ist, Visiten von *g* beziehungsweise *n* (und des
besten Kindes), Antwort des Orakels ja/nein. Je Partie dazu: Endstand, Zugzahl, Neustarts von GNU Go.

## 5. Endpunkte, Umfang, Genauigkeit und Teststärke

- **Primärer Endpunkt (Stufe 1):** Differenz des Endstands nach GNU Gos Zählung (Fläche), gepaart nach
  Partienummer, **S − A**, getrennt je Gegner. Zwei Gegner, also zwei primäre Tests: α = 0,05 / 2 = 0,025
  je Gegner, Intervalle zu 97,5 %.
- **Ergänzend, ohne Signifikanzurteil:** S − ZS und ZS − A als 95-%-Intervalle; Siege (exakter McNemar-Test,
  Clopper-Pearson) und alles **nach Farbe** getrennt, jeweils beschreibend.
- **Mehrfachvergleiche:** Nur die zwei primären Tests tragen ein Fehlerniveau. Alles andere ist
  beschreibend und wird nicht als bestanden oder nicht bestanden gelesen.
- **Fassungen:** **Stufe 1** = Arme A, S, ZS, **beide Gegner** (Präferenz von Hazeberry), nur der
  kombinierte Eingriff. **Vollentwurf** = sieben Arme (zusätzlich N, ZN, P, ZP); er folgt nur auf ein
  weiteres Go.

### Streuungsquelle

Gebraucht wird die SD der **gepaarten Differenz** des Endstands (A gegen S, gleiche Partienummer). Sie ist
für diesen Eingriff unbekannt. Planungswerte stammen aus anderen Messungen, mit ihren Bedingungen:

| Gegner | Quelle | Bedingungen | SD der Paardifferenz | Planungswert |
|---|---|---|---:|---:|
| GNU Go | `leeres-brett.md` §9, `muster-ohne-vorgabe.md` §5 | **ohne Vorgabe** | 56 bis 59 | 59 |
| Fuego | `komponenten.md` §9 | **mit sechs Vorgabesteinen** | 74 bis 83 (85 in `muster-ohne-vorgabe.md` §5) | 85 |

Für Fuego ohne Vorgabe ist **kein Wert belegt**; der Planungswert 85 ist eine Annahme. (Eine frühere
Fassung dieses Dokuments nannte 74 bis 83 fälschlich als Wert „ohne Vorgabe“.) Die Probe schätzt die SD
aus wenigen Paaren (bei 8 Paaren mit rund ±27 % relativer Unsicherheit) und prüft nur, ob die
Planungswerte um mehr als den Faktor 1,5 danebenliegen; sie ersetzt sie nicht.

### Intervallbreite und Teststärke sind verschieden

Mit z = 2,2414 (α = 0,025, zweiseitig), z₈₀ = 0,8416 (Teststärke 80 %), SD σ und *n* Paaren:

- **Halbe Breite des Intervalls** h = z · σ / √n. Das ist die **Genauigkeit**: Sie bestimmt, welchen Gewinn
  ein **Nullergebnis ausschließt** (Obergrenze = Punktschätzer + h).
- **Kleinster mit 80 % Wahrscheinlichkeit signifikant werdender wahrer Effekt**
  MDE₈₀ = (z + z₈₀) · σ / √n. Das ist die **Teststärke**. Sie ist größer als h.

| Paare *n* je Gegner | GNU Go (σ = 59): h / MDE₈₀ | Fuego (σ = 85): h / MDE₈₀ |
|---:|---:|---:|
| 240 | 8,5 / 11,7 | 12,3 / 16,9 |
| 480 | 6,0 / 8,3 | 8,7 / 12,0 |
| 960 | 4,3 / 5,9 | 6,1 / 8,5 |

Für einen wahren Effekt von 10 Punkten bei 80 % Teststärke brauchen GNU Go rund 331, Fuego rund 687 Paare
(σ wie oben). Die Größen sind aus Streuungen gerechnet, **nicht** aus einer erwarteten Wirkung; die alten
+1,6 Punkte je geändertem Zug gehen nicht ein. Die Zahl der Paare je Gegner (sie darf verschieden sein) wird
nach der Probe in einem Nachtrag vor dem Start festgelegt.

## 6. Lesart und Grenzen

**Ein Nullergebnis** (S − A nicht signifikant) bedeutet: *Dieser Eingriff bringt keinen nachgewiesenen
Gewinn.* Berichtet wird die **Obergrenze** des Intervalls („kein nachgewiesener Gewinn über +U Punkte“),
nicht „kein Effekt“. Es bedeutet **nicht**, dass Kandidatenabdeckung unwichtig ist. Es lässt offen:

- andere Simulationszahlen (im Spiel 750 bis 1300, hier 120);
- mehrere Zusatzkinder, andere Priors (milder als der Spitzenprior), eine andere Auswahl der Zusatzzüge;
- ob GNU Gos Zug ein guter Zug ist (er ist eine Referenz, kein Beweis);
- ob die Bewertung in den Blättern den Zug unterschätzt. Ein Nullergebnis wäre **verträglich** mit „die
  Bewertung ist der Engpass“, belegt es aber nicht.

**Ein positives Ergebnis** (S − A) besagt, dass der kombinierte Eingriff dem Spiel nutzt. Ob das am
Orakelzug liegt oder an einem beliebigen Zusatzkind mit Spitzenprior, zeigt erst die ergänzende Kontrolle
S − ZS, und auch sie nur mit den Grenzen aus §3. Es besagt nicht, dass Aufnahme oder Gewicht allein helfen
(Stufe 1 trennt das nicht). Es besagt nicht, dass
eine größere Wurzelkinderzahl hilft (das wäre ein anderer Eingriff ohne Orakel), und es zeigt keinen Weg,
den Zug ohne Orakel zu finden. Frühere Versuche, einen solchen Lerner zu bauen, sind verworfen
(`muster-endspiel-*.md`).

**Weitere Grenzen:** Das Orakel ist GNU Go, zugleich Lehrer von Netz und Mustern; ein Gewinn kann mit
dieser Verwandtschaft zusammenhängen (Hypothese). Alle Aussagen gelten für die gemessenen Gegner und
Bedingungen. Die Auswahl der Stellungen ist nicht zufällig, sondern wird durch das Spiel bestimmt; der
Eingriff ändert den Partieverlauf.

## 7. Laufzeitprobe (Stufe 0), vor dem Hauptversuch

Der Aufwand ist nicht bekannt: Das Orakel wird in jedem KI-Zug ab Zug 81 befragt (rund 140 Abfragen je
Partie, Zeit je Abfrage nicht gemessen), und die Partien enden wegen der Eingriffe nicht gleich lang. Die
Probe misst ihn, bevor der Umfang festgelegt wird.

**Umfang der Probe:** Seed 230, Arme A, S, ZS (die Arme von Stufe 1), je 8 Partien gegen GNU Go (je vier mit der KI als Schwarz
und als Weiß) und je 4 gegen Fuego (je zwei). Dazu die Kontrolle: Arm A mit ausgeschaltetem Schalter
reproduziert vier archivierte Partien (`leeres-brett-g-D`, Seed 222, Nr. 1 bis 4, zwei je Farbe) Zug für Zug. Die Probe
läuft in Actions mit Paketen, Schritt-Zeitlimit kürzer als Job-Zeitlimit, Upload mit `always()` und
Fortsetzen (Erfahrung aus der Diagnose: ein Job mit mehr als vier Stunden ist keine Option).

**Was die Probe auswertet:** Dauer je Partie (Median, Maximum) je Arm und Gegner; Zeit je Orakelabfrage;
Antwortquote und Neustarts des Orakels; Anteile der Fälle (a) bis (d) und Zahl der Eingriffe je Partie,
getrennt nach Farbe; ob Auslöser von S und ZS in jeder Partie bis zur ersten Abweichung übereinstimmen;
Streuung der Paardifferenz des Endstands (nur als Streuung, für die Planung, siehe §5).

**Was die Probe nicht auswertet:** die **Höhe** der Endstand-Unterschiede zwischen den Armen. Die Probe
sagt nichts über den Effekt; ihre Partien zählen nicht zum Hauptversuch. Ein Blick auf die Mittelwerte
wird nicht in eine Entscheidung eingehen.

**Technische Bedingungen für den Hauptversuch** (alle müssen erfüllt sein, sonst „kein Urteil“ für den
Start und eine Meldung mit Grund):

1. Arm A reproduziert die vier archivierten Partien bitgleich.
2. Die Orakelantwort kommt in mindestens 98 % der Abfragen (Abstürze von GNU Go 3.8 sind bekannt,
   `diagnose-p1p2.md` §9); das Orakel wird wie bisher neu gestartet.
3. Fall (d) tritt in **beiden Farben** auf; Anteile liegen im Bericht.
4. In jedem Paar S/ZS (und N/ZN, P/ZP) ist der erste Auslöser (Zugnummer und Fall) identisch.
5. Hochrechnung der Laufzeit des Hauptversuchs aus dem Maximum der Probe (nicht aus dem Mittel), plus
   50 % Reserve, bleibt unter dem Budget, das Hazeberry nach der Probe nennt.

## 8. Umsetzung (Stufe 1 umgesetzt, nicht gelaufen)

- **Engine:** ein Messschalter, **Standard aus**, nur über `extra` erreichbar (wie die Passregel), nie in
  der Oberfläche und nie im Browser gesetzt. Die Zahl entscheidet über den Arm; der Orakelzug kommt als
  Index im selben `extra`. Mit Schalter aus muss das Verhalten **bitgleich** bleiben (Test gegen vorhandene
  Partien und den Schalter-aus-Zweig).
- **Harness (`gnugo-duell.js`):** Option `--kandidaten-orakel ARM`, fragt das Orakel vor `getAIMove`, reicht
  den Zug durch, schreibt das Protokoll aus §4. Die bisherige Option `--orakel-zug` bleibt unverändert.
- **Workflow:** nur von Hand, Pakete mit Fortsetzen, Zeitlimit im Schritt kürzer als im Job, Upload mit
  `always()`, Ergebnis auf einen neuen Ergebnisbranch mit anschließendem PR (Schreibrecht freigegeben),
  getrennte Workflows für Probe und Hauptversuch.
- **Tests:** Schalter aus bitgleich; Rang-Nachbar und alle Fälle der Tabelle in §3 mit gebauten Listen;
  Prior-Rechnung gegen das Rechenbeispiel aus §2 und gegen die Default-Berechnung (ohne Eingriff identisch);
Eingriffe verändern nur die vorgesehenen Priors (Summe 1, Temperatur der ersten 16); **die Randfälle aus §2
(gleiche Scores, gleicher Rang, gleicher Prior, Zusatzkind schon mit höchstem Prior (d1)) werden bei der
Umsetzung ausdrücklich gegen das Default-Verhalten geprüft**: ohne Eingriff, im Fall (a), (b), (c1) und
bei entarteter Rechnung ist jede Priorität und jedes Kind **bitgleich** wie im Default; bei Aufnahme sind die
Priors der 16 Basiskinder genau die Default-Priors, umgerechnet mit der Normierung über 17; Kontrolle und
  Eingriff lösen in denselben Stellungen aus; Pässe, nicht gelistete Züge und fehlende Nachbarn ändern
  nichts; Protokollfelder vollständig; Workflows nur von Hand.

## 9. Gültigkeit

Zwei Zustände. **Ungültig** („kein Urteil“, Lauf rot) bei: Verletzung einer technischen Bedingung aus §7
im Hauptversuch; Orakelantwort unter 98 %; ungleich besetzte Arme (weniger als 98 % der Partien eines Arms
ausgewertet, oder ungleiche Zahl je Farbe); Auslöser von Eingriff und Kontrolle weichen in mehr als 0 Paaren
bis zur ersten Abweichung ab (gilt für S gegen ZS, im Vollentwurf auch N/ZN und P/ZP); die Prior-Summe eines
Eingriffs ist nicht 1 (Abweichung > 10⁻⁹); Wiederholungskontrolle (die ersten drei Partien eines Arms zweimal gespielt)
nicht identisch; Zählersummen der Fälle gehen nicht auf. Die Gültigkeit hängt **nicht** vom Ausgang ab
(Siegrate, Vorzeichen des Effekts).

## 10. Entscheidungen und Stand

Festgehalten (Präferenz von Hazeberry): **Stufe 1 mit beiden Gegnern** (GNU Go und Fuego), Arme A, S, ZS,
nur der kombinierte Eingriff, Hauptvergleich S − A.

**Stand: Stufe 1 umgesetzt (Go von Hazeberry), nichts gelaufen.** Umgesetzt und getestet:
- `index.html`: Messschalter `extra.kandidatenOrakel = {arm, g}` (nur Stufe „hard“, nur über `extra`,
  Standard aus). Ohne `extra` ist `getAIMove` unverändert; Arm A ändert nur das Protokoll.
  Zusätzliche Protokollfälle gegenüber §3: `x` (keine Antwort des Orakels), `c0`/`d0` (kein Rang-Nachbar),
  `e` (entartete Prior-Rechnung) – alle ohne Eingriff, also bitgleich zum Default.
  Protokollfelder je KI-Zug: `arm, g, fall, r, rn, nIdx, pG, pN, aufgenommen, angehoben, kinder, besuche`.
- `gnugo-duell.js`: `--kandidaten-orakel A|S|ZS`, `--kandidaten-ab` (Standard 80); das Orakel wird vor
  `getAIMove` gefragt (`reg_genmove`, zieht, legt nicht); Ergebnisfeld `kandidatenOrakel` mit Protokoll,
  Abfragen, fehlenden Antworten, Neustarts, Abfragezeit und Partiedauer. Unser Zug wird nie ersetzt.
- `spielen.sh`: `DUELL_ZUSATZ` für weitere Optionen (leer = unverändert).
- Tests: `tests/kandidaten-orakel.js` (Rechenbeispiel, Bit-Identität zum Default, alle Fälle und Randfälle,
  darunter gleiche Scores und Zusatzkind bereits mit höchstem Prior), `tests/kandidaten-orakel-spiel.js`
  (Replay in echten Stellungen für Schwarz und Weiß, Harness mit Attrappe, Bericht, Workflow).
- Workflow `kandidaten-orakel-probe.yml` und Bericht `auswertung/kandidaten-orakel/probe-bericht.js` für
  die Laufzeitprobe (§7). **Nicht gestartet.** Der Hauptversuch-Workflow wird erst nach der Probe geschrieben
  (Paarezahl und Budget hängen von ihr ab).

Noch offen:
1. **Zahl der Paare je Gegner** und das **Budget** (nach der Probe, siehe §5 und §7).
2. **Go** für die Laufzeitprobe (eigenes Go nach geprüfter Umsetzung) und später für den Hauptversuch.
