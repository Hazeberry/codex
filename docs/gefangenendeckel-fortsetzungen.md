# Gefangenendeckel: kontrollierte freie Fortsetzungen

Vorabfestlegung, 06.11.2026. Nach dem Befund der Diagnose 42261233661 als
nächster Testaufbau vorbereitet; inzwischen nach Go ausgeführt (Ergebnis unten).
Durchsicht vor Merge
und ausdrückliches Go vor dem manuellen Actions-Lauf gemäß CLAUDE.md.
Engine-Datei und Spieldefaults bleiben unverändert.

## Frage

Verändert `captureCap=200` neben Q auch die gespielten Fortsetzungen günstig?
Die vorherige Diagnose zeigte weniger Auslösungen der archivgebundenen
Aufgabesonde, aber keine tatsächlichen Endstände. Hier ist Aufgabe auf beiden
Seiten aus. Der Vergleich misst Zugwahl/Endstand bei erlaubtem Weiterspielen;
er misst nicht die Häufigkeit falscher Aufgaben in einem freien Turnier.

Historische captureCap-Versuche aus `aufgabe-deckel.md` werden berücksichtigt.
Das ist kein dritter identischer Lauf zur nachträglichen Signifikanzsuche.
Vier bewusst gewählte Startstellungen sind keine allgemeine Spielstärkestichprobe.

## Bedingungen

| Punkt | Festlegung |
|---|---|
| Arm A | Referenzparameter des jeweiligen Berichts, captureCap=0 |
| Arm B | Dieselben Parameter, nur captureCap=200 |
| Beide Arme | Aufgabe aus, adaptives Budget aus, deathTransfer=1, Rollout-Tiefe 24 |
| Suchmenge | 120 und 3000 feste Simulationen je Engine-Zug |
| Gegner | GNU Go 3.8 Stufe 1, nie aufgeben |
| Zählung | GNU Go 1 final_score, chinesische Fläche, Komi 7,5 für Weiß |
| Vorgabe | Keine zusätzlichen Vorgabesteine |
| Seeds | 761 und 762; in jedem A/B-Paar gleiche Engine- und Gegner-Seeds |
| Ende | Zwei aufeinanderfolgende Pässe, maximal 600 zusätzliche Züge |

Vier Originalstellungen, aus vollständigen Zugfolgen rekonstruiert:

- Partie 113 nach Zug 95: vor dem Gruppenverlust.
- Partie 113 nach Zug 113: ursprüngliche Aufgabestellung.
- Partie 127 nach Zug 111: vor dem Gruppenverlust.
- Partie 127 nach Zug 127: ursprüngliche Aufgabestellung.

Jede zusätzlich mit vertauschten Steinfarben und Gefangenen. Die untersuchte
Engine zieht in beiden Fassungen zuerst in der Fortsetzung: ursprünglich Weiß,
nach Farbaustausch Schwarz. Die gesamte Vorgeschichte wird in beide GTP-Prozesse
übertragen; keine künstliche Initialisierung nur über Steine. Baumzustand und
Zufall der ursprünglichen Handy-Suche sind nicht rekonstruierbar. Jeder Lauf
beginnt mit frischem Prozess; während der Fortsetzung bleibt Tree-Reuse wie im
Bericht an. Gleiches Seed bedeutet nach einer Abweichung keine gleichen Züge.

Beim Farbaustausch bleibt Komi bei Weiß. Die GNU-Go-Zugwahl kann sich dadurch
ändern. Daher werden Unterschiede stets innerhalb derselben Stellung/Farbe/
Suchmenge/Seed zwischen A und B betrachtet. Gespiegelte Vorgeschichten können
mit Weiß beginnen; das sind diagnostische Startstellungen, keine neuen regulären
Eröffnungspartien. SGFs erhalten den passenden PL-Eintrag und die gesamte Historie.

**Umfang: 4 Stellungen × 2 Farben × 2 Budgets × 2 Seeds × 2 Arme = 64 Partien,
32 A/B-Paare.** Kein weiteres Spiel und keine Wiederholung eines ungünstigen
Ergebnisses. Die historische 494-Züge-Partie wird hier nicht als zusätzlicher
Fall gerechnet. Normalisierte Eingabe: `docs/daten/death-transfer/eingaben.json`.

## Endpunkte und Auswertung

Primär: Endstand aus Sicht der untersuchten Engine und gepaarte Differenz
**Deckel minus Default**, separat je Ausgangsstellung, Farbe, Suchmenge und Seed.
Positiv bedeutet hier besserer Endstand gegen denselben Gegner unter denselben
Bedingungen; es ist kein Beweis optimaler Zugwahl. Siege/Niederlagen und zusätzliche
Zugzahl werden beschreibend daneben dokumentiert. Alle 64 SGFs werden gesichert.

Die 32 Unterschiede sind aufgrund nur zweier Ursprungspartien und wiederholter
Startstellungen voneinander abhängig. Dieser begrenzte Diagnosepilot verwendet
keine inferenziellen p-Werte oder Gewinnratenintervalle als Defaultentscheidung.
Gleichgerichtete Ergebnisse zeigen höchstens Konsistenz innerhalb dieser Fälle.
Bei gemischten Ergebnissen werden schlechtere Fortsetzungen genauso vollständig
gezeigt. Ein belastbarer allgemeiner Stärkevergleich benötigte eigene unabhängige
Partien und eine neue Vorabfestlegung; kein automatischer Defaultwechsel.

Das Weiterspielen ohne Aufgabe trennt das Meldesignal von der tatsächlichen
Fortsetzung. Es belegt nicht, wie ein Mensch aus dieser Stellung geantwortet
hätte. GNU Go ist zugleich Gegner und Schiedsrichter; seine Fehler sowie die
GNU-Go-geprägten Muster-/Netzdaten sind nicht voneinander isoliert. Eine zweite
Gegnerfamilie gehört nicht zu diesem Pilotlauf.

## Gültigkeit und Sicherung

Der Planer validiert die Originalarchive und erzeugt acht exakte Startbretter
mit Vorgeschichte, Gefangenen und Parametern. Beide GTP-Prozesse müssen vor der
Fortsetzung dasselbe vorbereitete Brett zeigen. Das erste neue Ereignis trägt
mc+1; Farben wechseln danach fortlaufend. Fehler, illegaler/abgelehnter Zug,
Prozessabbruch, Aufgabe, Zeitlimit oder Zugdeckel machen den betreffenden Lauf
ungültig. Es gibt keinen stillen Partieausschluss und keinen automatischen Neustart.

Gültiger Gesamtbericht nur bei 64 vollständigen Partien und 32 vollständigen
Paaren mit übereinstimmenden Quellen, richtigen Armen, zwei Schluss-Pässen,
übereinstimmenden Schlussbrettern beider Prozesse und lesbarem Endstand. Der
Reporter prüft Parameter, Zugnummern/Farben, Endstands-Perspektive und SGF gegen
Rohzugliste. Sonst **ungültig, kein Urteil**, Workflow rot. Auch Teilrohdateien
werden mit always() hochgeladen.

Gesichert: Quellcommit, Engine-/Eingabe-SHA-256, GNU-Go-Version, tatsächliche
Parameter/Seeds, vollständige GTP-Dialoge, Zuglisten, Endbretter, Endstände und SGFs.
Der ursprüngliche Quellenstand der vorbereiteten Startstellungen muss mit dem
Messjob übereinstimmen.

## Laufbudget und kurze Prüfungen

Nur GitHub Actions, ubuntu-24.04, maximal acht Spieljobs parallel. Je GTP-Antwort
120 Sekunden; Rechenschritt 27 Minuten, Job 35 Minuten einschließlich Upload-Reserve.
Laufzeit und Kosten des 64-Partien-Piloten sind vor dem ersten Lauf nicht
kalibriert. Ein Timeout ist kein Ergebnis und berechtigt nicht automatisch zu
einem Ersatzlauf.

`tests/deckel-fortsetzungen.js` ist in Testsammlung und README eingetragen.
Geprüft werden acht rekonstruierte Startstellungen, 64 eindeutige Plankonfigurationen
und 32 Paare. Sieben Python-Tests mit reinen GTP-Attrappen prüfen Parametertrennung,
Zugnummern, Farben, Wertungsperspektive, SGF, Abbruch/Aufgabe, Prozessbereinigung,
den vollständigen Bericht und Ablehnung beschädigter Ergebnisse. Die kurzen
Tests spielen keine tatsächliche Engine-Partie.

## Ergebnis des freigegebenen Piloten (06.11.2026)

Go nach Durchsicht von PR #16; nach grüner Node-/Browser-CI gemergt.
Quellenstand `92501db0d2aa86e6f1a56707fad8718f3cf24245`.
[Lauf 42266545848](https://github.com/Hazeberry/codex/actions/runs/42266545848):
**gültig**, 64/64 vollständige Partien, 32/32 vollständige A/B-Paare.
Alle 66 Jobs grün, keine Timeouts, Abbrüche oder Wiederholungen. Alle Partien
enden mit zwei Pässen, nach 68 bis 313 zusätzlichen Zügen.

Vollständiges unverändertes Actions-Artefakt unter
`docs/daten/deckel-fortsetzungen/lauf1/deckel-fortsetzungen-gesamt.zip`,
SHA-256 gegen GitHubs Digest geprüft. Daneben Maschinenbericht, vorbereitete
Startstellungen und Manifest mit Quellen-/Dateiprüfsummen. Alle 64 SGFs zusätzlich
entpackt unter `sgf/`. Sämtliche 64 Quellenbelege stimmen mit dem gemessenen
Commit und den Eingabe-/Engine-Prüfsummen überein. A und B unterscheiden sich
in ihren tatsächlichen Suchparametern ausschließlich durch captureCap.

### Primärer Befund: Wirkung hängt von der Ausgangsstellung ab

Deckel minus Default, jeweils acht Kontexte aus Farben × Budgets × Seeds:

| Ausgangsstellung | besser / gleich / schlechter | Punktedifferenz, Spanne | Mittel, rein beschreibend |
|---|---:|---:|---:|
| Partie 113 nach 95 | 0 / 6 / 2 | −6 bis 0 | −1,5 |
| Partie 113 nach 113 | 0 / 0 / 8 | −42 bis −2 | −12,0 |
| Partie 127 nach 111 | 0 / 8 / 0 | 0 | 0,0 |
| Partie 127 nach 127 | 8 / 0 / 0 | +14 bis +58 | +36,5 |

Über alle 32 Paare: acht bessere, 14 gleiche und zehn schlechtere Endstände mit
Deckel. Der rein beschreibende Gesamtmittelwert +5,75 verdeckt die gegensätzlichen
Ausgangsstellungen. Er ist keine inferenzielle Verbesserung der Spielstärke und
keine vorab festgelegte Default-Entscheidung. Alle Einzelwerte bleiben primär
maßgeblich; sie stehen in `bericht.json`.

Bei ausgeschalteter Aufgabe gewinnt der Default 31/32 Fortsetzungen, der Deckel
30/32. Das sind keine allgemeinen Siegquotenschätzungen: nur vier gezielt gewählte
Stellungen. In einem knappen Weiß-Fall vor dem Gruppenverlust (Partie 113 nach 95,
3000 Simulationen, Seed 762) kippt ein Default-Sieg W+4,5 mit Deckel in B+1,5.
Die farbgetauschte Variante verliert die untersuchte schwarze Engine mit beiden
Armen (−10,5 bzw. −16,5 aus ihrer Sicht).

### Einzelwerte: ursprüngliche Weiß-Perspektive

Endstände aus Sicht der untersuchten Engine, positiv = Sieg:

| Start | Simulationen | Seed | Default | Deckel | Differenz |
|---|---:|---:|---:|---:|---:|
| 113 nach 95 | 120 | 761 | +112,5 | +112,5 | 0 |
| 113 nach 95 | 120 | 762 | +120,5 | +120,5 | 0 |
| 113 nach 95 | 3000 | 761 | +174,5 | +174,5 | 0 |
| 113 nach 95 | 3000 | 762 | +4,5 | −1,5 | −6 |
| 113 nach 113 | 120 | 761 | +178,5 | +176,5 | −2 |
| 113 nach 113 | 120 | 762 | +178,5 | +176,5 | −2 |
| 113 nach 113 | 3000 | 761 | +178,5 | +136,5 | −42 |
| 113 nach 113 | 3000 | 762 | +178,5 | +176,5 | −2 |
| 127 nach 111 | 120 | 761 | +104,5 | +104,5 | 0 |
| 127 nach 111 | 120 | 762 | +104,5 | +104,5 | 0 |
| 127 nach 111 | 3000 | 761 | +46,5 | +46,5 | 0 |
| 127 nach 111 | 3000 | 762 | +46,5 | +46,5 | 0 |
| 127 nach 127 | 120 | 761 | +88,5 | +102,5 | +14 |
| 127 nach 127 | 120 | 762 | +86,5 | +102,5 | +16 |
| 127 nach 127 | 3000 | 761 | +92,5 | +150,5 | +58 |
| 127 nach 127 | 3000 | 762 | +92,5 | +150,5 | +58 |

Die schwarze Perspektive ist vollständig im Maschinenbericht enthalten. Die
Punktedifferenzen B−A stimmen in diesem Pilot für beide Farben überein. Absolute
Endstände unterscheiden sich wegen des Komi und gegebenenfalls anderer Züge.
26 von 32 Farbpaaren haben sogar dieselbe Feldzugfolge mit vertauschten Farben;
Farben sind hier daher ausdrücklich keine unabhängigen Wiederholungen.

### Ausgewählte Partien zum Nachspielen

- Aufgabe nach 113, 3000 Simulationen, Seed 761:
  [Default W+178,5](daten/deckel-fortsetzungen/lauf1/sgf/partie113-113-W-3000-761-0.sgf),
  [Deckel W+136,5](daten/deckel-fortsetzungen/lauf1/sgf/partie113-113-W-3000-761-200.sgf).
- Aufgabe nach 127, 3000 Simulationen, Seed 761:
  [Default W+92,5](daten/deckel-fortsetzungen/lauf1/sgf/partie127-127-W-3000-761-0.sgf),
  [Deckel W+150,5](daten/deckel-fortsetzungen/lauf1/sgf/partie127-127-W-3000-761-200.sgf).
- Knapper Fall nach Zug 95, 3000 Simulationen, Seed 762:
  [Default W+4,5](daten/deckel-fortsetzungen/lauf1/sgf/partie113-95-W-3000-762-0.sgf),
  [Deckel B+1,5](daten/deckel-fortsetzungen/lauf1/sgf/partie113-95-W-3000-762-200.sgf).

### Einordnung

Die vorherige Q-Diagnose und dieser Pilot beantworten verschiedene Fragen:
Der Deckel verhindert auf den festgehaltenen Aufgabepfaden die Q-Auslösung,
liefert aber beim freien Weiterspielen keine durchgehend besseren Endstände.
In Partie 113 ist er nach der Aufgabe in allen Varianten schlechter, in Partie
127 nach der Aufgabe in allen besser. Die Ergebnisse werden nicht zu einer
pauschalen Verbesserung oder Wirkungslosigkeit umgedeutet.

Damit ist captureCap=200 nach diesem Pilot kein begründeter allgemeiner Ersatz
für den Default. Das Problem der unzuverlässigen Q-Aufgabe bleibt ein gesonderter
Ansatz: Die ursprünglichen weißen Aufgabestellungen gewinnen hier mit beiden
Armen und ausgeschalteter Aufgabe. Eine mögliche Absicherung der Aufgabe bei
beibehaltener Suchbewertung wäre ein neuer Eingriff mit eigener Vorabfestlegung
und Go. Dieser Versuch ändert keinen Default und beweist keine allgemeine
Überlegenheit des Referenzarms.
