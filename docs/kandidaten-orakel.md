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

**Frage:** Verbessert es das Spiel, wenn GNU Gos Zug (Orakel) im Endspiel zusätzlich unter den
Wurzelkindern steht, und wie viel davon ist die **Aufnahme** des Zuges und wie viel sein **Prior-Gewicht**?

## 2. Zwei Dinge, die getrennt werden müssen

Ein zusätzlicher Zug mit Spitzenprior testet **beides zugleich**: dass er überhaupt gesucht werden kann
(Aufnahme), und dass die Suche ihn bevorzugt (Gewicht). Deshalb gibt es getrennte Eingriffe.

- **Aufnahme.** Der Orakelzug wird als **17. Wurzelkind** aufgenommen, wenn er nicht schon unter den
  16 ist. Sein Prior ist der **natürliche**: derselbe Softmax aus seinem Score und derselbe Netz-Anteil wie
  bei jedem Kind, mit der Temperatur der ersten 16 festgehalten (damit der Zusatz die Priors der anderen
  nur durch die Renormierung verändert, nicht durch eine geänderte Temperatur).
- **Gewicht (Spitzenprior).** Der Prior eines Kindes wird auf den **größten Prior der ersten 16** gesetzt
  (auf den fertigen Prior-Vektor nach dem Netz-Anteil, danach auf Summe 1 renormiert). Das ist die Art,
  wie `krisenKandidaten` einem Zug den Wert des besten Kandidaten gibt.

Vorbild für die Anwendung ist `krisenKandidaten` (Zug bekommt die Chance, die Suche entscheidet), nicht
der erzwungene Zug des Orakel-Tests. Die Eingriffe wirken an der Wurzel in jedem KI-Zug ab Zug 81
(`mc` ≥ 80, wie das Endspiel-Netz) bis zum Partieende.

### Fälle je KI-Zug

*L* ist die Kandidatenliste nach dem Netz und den Krisenkandidaten, sortiert; die ersten 16 sind die
Kinder. *g* ist der Zug des Orakels (GNU Go Stufe 10, `reg_genmove`, vor der Suche der KI für dieselbe
Stellung abgefragt), *r* sein Rang in *L*.

| Fall | Bedingung | Bedeutung |
|---|---|---|
| (a) | *g* ist Pass | kein Eingriff in **keinem** Arm |
| (b) | *g* steht nicht in *L* (r = 0; auch z. B. für die KI verbotener Ko-Zug) | kein Eingriff in **keinem** Arm |
| (c) | 1 ≤ r ≤ 16, *g* ist schon Kind | Aufnahme gibt es nichts zu tun; Gewicht kann angehoben werden |
| (c1) | *g* hat schon den größten Prior (oder, in der Kontrolle, der Nachbar *n*) | in keinem Arm ein Eingriff in diesem Fall |
| (d) | r > 16, *g* steht in *L* | Aufnahme als 17. Kind möglich |

Nach P2 (nur Schwarz, andere Bedingungen, **keine Prognose**) wäre zu erwarten: (c) rund 39 %, (d) rund
60 %, (b) unter 1 %, (a) rund 1 %. Die Probe misst die tatsächlichen Anteile, beide Farben getrennt.

## 3. Arme und Kontrollen

Gleicher Auslöser, gleiche Kinderzahl, gleiche Priorbehandlung. Die **Kontrolle** unterscheidet sich vom
Eingriffsarm **nur** im gewählten Zug: statt *g* wird der **Rang-Nachbar** *n* genommen.

**Rang-Nachbar:** In (d): *n* = *L*[r+1] (der nächst schlechtere Zug), ist *g* der letzte Eintrag, dann
*L*[r−1]; liegt *n* dabei unter den ersten 16, gibt es keinen zulässigen Nachbarn. In (c): *n* = *L*[r+1],
bei r = 16 *L*[15]. *n* ist immer ein anderer Zug als *g*. Der Nachbar hat einen ähnlichen natürlichen
Prior wie *g*, ist aber nicht der Orakelzug. Gibt es keinen zulässigen Nachbarn, oder hat im Fall (c) *g* oder *n* schon den größten Prior, macht
**auch der Eingriffsarm nichts** (so bleibt der Auslöser gleich) und die Stellung wird gezählt.

| Arm | Fall (d), r > 16 | Fall (c), 1 ≤ r ≤ 16, weder *g* noch *n* hat den größten Prior | (a), (b), (c1) |
|---|---|---|---|
| **A** (Default) | nichts | nichts | nichts |
| **N** (Aufnahme) | *g* als 17. Kind, natürlicher Prior | nichts | nichts |
| **ZN** | *n* als 17. Kind, natürlicher Prior | nichts | nichts |
| **P** (Gewicht) | nichts | Spitzenprior für *g* | nichts |
| **ZP** | nichts | Spitzenprior für *n* | nichts |
| **S** (Aufnahme + Gewicht) | *g* als 17. Kind, Spitzenprior | Spitzenprior für *g* | nichts |
| **ZS** | *n* als 17. Kind, Spitzenprior | Spitzenprior für *n* | nichts |

Damit gilt: In allen Armen mit Eingriff wächst die Kinderzahl in denselben Stellungen um genau eins
(Fall (d)), ein Spitzenprior wird in denselben Stellungen vergeben (Fall (c) und (d) bei S), und was
sich zwischen Arm und Kontrolle unterscheidet, ist allein die Identität des Zuges.

**Was die Vergleiche aussagen:**

- **S − ZS** (primär): Wert des **Orakelzugs** als Spitzenkandidat gegenüber einem beliebigen Nachbarn
  derselben Eingriffsart. Die Kosten der Eingriffsart selbst (Verdünnung der 120 Simulationen auf mehr
  Kinder, Rauschen eines beliebigen Spitzenzugs) sind darin herausgerechnet.
- **N − ZN**: Wert der **Aufnahme allein** (natürlicher Prior, kaum besucht, wenn die Suche ihn nicht von
  selbst für gut hält).
- **P − ZP**: Wert des **Gewichts allein** für schon vorhandene Orakelzüge.
- **S − A**: Gesamteffekt des Eingriffs **einschließlich** seiner Kosten (beschreibend). Zeigt zugleich, was
  die Kontrolle ZS − A an Kosten hat.

Eine Zerlegung S − ZS in „Aufnahme“ und „Gewicht“ ist **nicht additiv** vorausgesetzt; N − ZN und P − ZP
sind getrennte Messungen von Teilen des Eingriffs, keine Summanden.

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
in *L*), ob *g* schon Kind war, gewählter Nachbar *n* und sein Rang, aufgenommen ja/nein, gespielter Zug,
Rang des gespielten Zugs in *L*, ob der gespielte Zug *g* ist, Visiten von *g* beziehungsweise *n* (und des
besten Kindes), Antwort des Orakels ja/nein. Je Partie dazu: Endstand, Zugzahl, Neustarts von GNU Go.

## 5. Endpunkte, Umfang, Auflösung

- **Primärer Endpunkt:** Differenz des Endstands nach GNU Gos Zählung (Fläche), gepaart nach Partienummer,
  für S − ZS, getrennt je Gegner. Sekundär: N − ZN, P − ZP, S − A, Siege (exakter McNemar-Test,
  Clopper-Pearson-Intervalle) und alles **nach Farbe** getrennt (beschreibend).
- **Mehrfachvergleiche:** Drei Vergleiche (S − ZS, N − ZN, P − ZP) je Gegner, α = 0,05 / 3 je Vergleich,
  Intervalle zu 98,3 %. S − A ist beschreibend.
- **Umfang:** Der Vollentwurf hat sieben Arme. Die Zahl der Paare je Arm und Gegner und die Zahl der Jobs
  werden **erst nach der Laufzeitprobe** (§7) in einem Nachtrag vor dem Start festgelegt. Ist der
  Aufwand zu groß, gilt die **Stufe-1-Fassung** mit den Armen A, S, ZS (primärer Vergleich); N, ZN, P, ZP
  folgen dann nur auf ein weiteres Go. Beide Fassungen sind damit vorab beschrieben.
- **Erkennbare Größe:** Aus der Streuung der Paardifferenz (bisher 74 bis 83 Punkte ohne Vorgabe,
  `komponenten.md`), nicht aus einer erwarteten Wirkung. Bei 480 Paaren und 98,3 % ist die halbe Breite
  rund 2,39 · 80 / √480 ≈ 8,7 Punkte; bei 240 Paaren rund 12. Wirkungen darunter sind **nicht sichtbar**.
  Die Probe liefert eine Schätzung der Streuung; die endgültige Breite steht im Nachtrag vor dem Start.

## 6. Lesart und Grenzen

**Ein Nullergebnis** (S − ZS nicht signifikant) bedeutet: *Dieser Eingriff bringt keinen nachgewiesenen
Gewinn.* Berichtet wird die **Obergrenze** des Intervalls („kein nachgewiesener Gewinn über +U Punkte“),
nicht „kein Effekt“. Es bedeutet **nicht**, dass Kandidatenabdeckung unwichtig ist. Es lässt offen:

- andere Simulationszahlen (im Spiel 750 bis 1300, hier 120);
- mehrere Zusatzkinder, andere Priors (milder als der Spitzenprior), eine andere Auswahl der Zusatzzüge;
- ob GNU Gos Zug ein guter Zug ist (er ist eine Referenz, kein Beweis);
- ob die Bewertung in den Blättern den Zug unterschätzt. Ein Nullergebnis wäre **verträglich** mit „die
  Bewertung ist der Engpass“, belegt es aber nicht.

**Ein positives Ergebnis** besagt, dass der Orakelzug als Spitzenkandidat hilft. Es besagt nicht, dass
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

**Umfang der Probe:** Seed 230, Arme A, S, ZS, je 8 Partien gegen GNU Go (je vier mit der KI als Schwarz
und als Weiß) und je 4 gegen Fuego (je zwei). Dazu die Kontrolle: Arm A mit ausgeschaltetem Schalter
reproduziert vier archivierte Partien (`leeres-brett-g-D`, Seed 222, Nr. 1 bis 4, zwei je Farbe) Zug für Zug. Die Probe
läuft in Actions mit Paketen, Schritt-Zeitlimit kürzer als Job-Zeitlimit, Upload mit `always()` und
Fortsetzen (Erfahrung aus der Diagnose: ein Job mit mehr als vier Stunden ist keine Option).

**Was die Probe auswertet:** Dauer je Partie (Median, Maximum) je Arm und Gegner; Zeit je Orakelabfrage;
Antwortquote und Neustarts des Orakels; Anteile der Fälle (a) bis (d) und Zahl der Eingriffe je Partie,
getrennt nach Farbe; ob Auslöser von S und ZS in jeder Partie bis zur ersten Abweichung übereinstimmen;
Streuung der Paardifferenz des Endstands (nur als Streuung, für die Auflösung).

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

## 8. Umsetzung (beschrieben, nicht umgesetzt)

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
  Eingriffe verändern nur die vorgesehenen Priors (Summe 1, Temperatur der ersten 16); Kontrolle und
  Eingriff lösen in denselben Stellungen aus; Pässe, nicht gelistete Züge und fehlende Nachbarn ändern
  nichts; Protokollfelder vollständig; Workflows nur von Hand.

## 9. Gültigkeit

Zwei Zustände. **Ungültig** („kein Urteil“, Lauf rot) bei: Verletzung einer technischen Bedingung aus §7
im Hauptversuch; Orakelantwort unter 98 %; ungleich besetzte Arme (weniger als 98 % der Partien eines Arms
ausgewertet, oder ungleiche Zahl je Farbe); Auslöser von Eingriff und Kontrolle weichen in mehr als 0 Paaren
bis zur ersten Abweichung ab; Wiederholungskontrolle (die ersten drei Partien eines Arms zweimal gespielt)
nicht identisch; Zählersummen der Fälle gehen nicht auf. Die Gültigkeit hängt **nicht** vom Ausgang ab
(Siegrate, Vorzeichen des Effekts).

## 10. Offene Entscheidungen für Hazeberry

1. **Vollentwurf (sieben Arme) oder Stufe 1 (A, S, ZS)?** Die Probe liefert die Grundlage; die Zerlegung in
   Aufnahme und Gewicht braucht N, ZN, P, ZP.
2. **Gegner:** beide (GNU Go und Fuego) oder zuerst nur GNU Go (das Orakel ist selbst GNU Go).
3. **Budget** für den Hauptversuch (nach der Probe).
4. **Go** für die Umsetzung (Schalter, Harness, Workflows, Tests) und danach getrennt für die Probe.
