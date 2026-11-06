# Gefangenendeckel: kontrollierte freie Fortsetzungen

Vorabfestlegung, 06.11.2026. Nach dem Befund der Diagnose 42261233661 als
nächster Testaufbau vorbereitet. Keine Partien gestartet. Durchsicht vor Merge
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
