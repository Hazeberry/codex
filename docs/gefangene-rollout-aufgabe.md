# Gefangenenwert, Rollout-Verluste und Q-basierte Aufgabe

Vorabfestlegung, 06.11.2026. Auftrag: diesen nächsten Ansatz vorbereiten.
Testaufbau und kurze Funktionsprüfungen; noch keine Messserie gestartet.
Gemäß CLAUDE.md vor Merge zur Durchsicht, danach eigenes Go für den Actions-Lauf.
Keine Änderung an `index.html` oder Spieldefaults.

## Warum dieser Aufbau

Die deathTransfer-Diagnose 42256206462 ließ Q an beiden aktuellen Aufgabestellungen
auch ohne Transfer unter −0,95. Der Gefangenenterm blieb dominant. Wir unterscheiden
nun bereits vorhandene Gefangene von zusätzlichen Gefangenen im Baum und Rollout.
`deathTransfer` bleibt in allen Armen auf 1; seine Wirkung ist nicht erneut der Faktor.

`captureCap=200` wurde bereits untersucht (`aufgabe-deckel.md`): erst 392/720 Siege
als Nebenbefund, dann 386/720 als Hauptendpunkt, p=0,053. Der Default blieb 0.
Dieser Aufbau ist keine dritte Wiederholung zum Überschreiten jener Schwelle.
Er untersucht Mechanismen an fest gewählten Stellungen, keine allgemeine Stärke.

## Vier Diagnosearme

| Arm | captureCap | mctsRolloutDepth |
|---|---:|---:|
| A, Referenz | 0 | 24, aus dem jeweiligen Bericht |
| B, Gefangenendeckel | 200 | 24 |
| C, keine zusätzlichen Rollout-Züge | 0 | 0 |
| D, Kombination | 200 | 0 |

Tiefe 0 lässt die Baumsuche bestehen: bewertet wird die erreichte Blattstellung
sofort. Es bedeutet weder keine Suche noch keine Schläge im Suchbaum.
Der Deckel begrenzt nur den tatsächlichen Gefangenenterm; den mit captureWeight
gewichteten deathTransfer-Term kappt er nicht. Alle übrigen Parameter bleiben
wie in den archivierten Berichten, insbesondere captureWeight=20 und Skala=200.

## Eingaben und Umfang

Bewährte normalisierte Eingaben aus `docs/daten/death-transfer/eingaben.json`:

| Partie | Stellungen nach Zug |
|---|---|
| 113 | 101, 103, 105, 107, 109, 111, 113 |
| 127 | 117, 119, 121, 123, 125, 127 |
| Alt 494 | 85, 87, 89, 91, 93 |

Originalzüge werden rekonstruiert; frühere doppelte Diagnoseeinträge sind keine
zusätzlichen Positionen. Vor dem Lauf vollständiger Abgleich aller drei Endbretter
und Gefangenen gegen die Referenzen sowie Legalitätsprüfung.

Beide Farben (Steinfarben und Gefangene vertauscht, keine geometrische Drehung),
120 und 3000 feste Simulationen, Seeds 741/742, keine Vorgabe, kein Orakel,
frische Prozesse und frische Suchbäume ohne Übernahme. Adaptive Zeit aus, Aufgabe
in der Suche aus. Komi wird von dieser Engine nicht für die Suche verwendet.
Die historische Territory-Partie ist Kontext, kein vergleichbarer Endstand.

18 Stellungen × 2 Farben × 2 Budgets × 2 Seeds × 4 Arme = **576 Abfragen**.
Jede zusätzlich mit uninstrumentierter Suche kontrolliert: **1152 Suchen**.
72 Pakete, jeweils acht Abfragen plus acht Kontrollen. Maximal acht Jobs parallel;
Worker 120 Sekunden, Rechenschritt 27 Minuten, Job 35 Minuten mit Upload-Reserve.
Keine automatische Wiederholung. Ressourcenbedarf vor dem ersten Lauf unkalibriert.

## Was protokolliert wird

Nur die im Messprozess geladene Worker-Kopie wird instrumentiert. Die ausgelieferte
Datei bleibt unverändert. Je bewerteter Simulation:

1. Gesamtwert, tatsächlicher Gefangenenwert nach Deckel, Transfer und übriger Wert.
2. Beide Gefangenenzähler direkt vor und nach dem Rollout.
3. Statische Bewertung unmittelbar vor dem Rollout.
4. Wurzelzug, Blattwert nach tanh und exaktes Q als Mittel seiner Blattwerte.

Aus den Zählern wird der rohe Gefangenenwert exakt zerlegt in:

- bei Beginn der Suche bereits vorhanden;
- zusätzlich im Suchbaum entstanden;
- zusätzlich im Rollout entstanden;
- gesonderte Korrektur durch einen eventuell aktiven Deckel.

Das sind Salden aus eigener und gegnerischer Sicht. Es werden keine einzelnen
Gruppenidentitäten verfolgt; aus einem Saldo allein folgt nicht, welche Gruppe
gefangen wurde. Material-/Freiheitsverluste können zusätzlich im Restwert stecken.

Gegenrechnungen auf denselben Default-Blättern entfernen einzeln nur den initialen
Gefangenensaldo bzw. nur den zusätzlichen Rollout-Saldo. Der Deckel wird danach neu
angewandt; alle anderen Blattmerkmale bleiben dabei bestehen. Solche Gegenrechnungen
sind keine legalen Ersatzstellungen und keine tatsächlich anders verlaufene Suche.
Die echten B/C/D-Suchen beantworten eine andere Frage und dürfen andere Blätter
und Besuchsgewichte erzeugen. Die statische Vor-Rollout-Bewertung zeigt darüber
hinaus den gesamten Bewertungswechsel, nicht nur den Gefangenenterm.

## Archivgebundene Aufgabesonde

Die ungerundeten Q-Werte jedes Arms werden in Zugfolge ausgewertet:
mc ≥ 60, Q ≤ −0,95, fünf Abfragen in Folge, Abstand jeweils zwei Brettzüge.
Startserie 0 am Beginn jedes beobachteten zusammenhängenden Fensters;
Datenlücken und Erholung setzen die Serie zurück. Zusätzlich dieselbe Folge
mit Aufgabe aus: keine Auslösung. Die abgeschaltete Gebietsbremse entspricht
den Berichten. Benson-Aufgabe ist nicht Gegenstand dieser Q-Sonde.

Jeder gewählte Zug wird mit dem nächsten Originalzug verglichen. Auch bei
Abweichung bleibt die Folge ein bewusst festgehaltener Archivpfad. Dann ist sie
insbesondere keine rekonstruierte reale Aufgabenentscheidung oder frei gespielte
Partie. Auch ein Ausbleiben der Sonde beweist keinen Sieg beim Weiterspielen.

## Vorab festgelegte Endpunkte

Primär, pro Stellung/Farbe/Budget/Seed:

- initialer, Baum- und Rollout-Beitrag zum Gefangenenterm der gewählten Blätter;
- Q-Differenz B−A (Deckel), C−A (Rollout-Tiefe) und Wechselwirkung D−C−B+A;
- erster Auslösepunkt der archivgebundenen Aufgabesonde je Arm oder keine Auslösung.

Sekundär: übrige Bewertungsänderung im Rollout, geänderte Zugwahl, Gegenrechnungen
an denselben Blättern. Quellen, Zufallsverbrauch, N/W/P und Rohblätter werden gesichert.
Keine Änderung der Skala in diesem Aufbau, keine Kalibrierung als Gewinnchance.

Deskriptive gepaarte Diagnose: keine p-Werte, Siegquoten oder Elo aus den gezielt
gewählten, voneinander abhängigen Positionen. Ein höheres Q belegt weder bessere
Züge noch weniger falsche Aufgaben im freien Spiel. Eine armweise Verbesserung
nur des Meldesignals ist von einer besseren Stellungswahl zu unterscheiden.

## Gültigkeit und Folgeschritte

Gültig nur bei 72 vollständigen Paketen, 576 Abfragen und 576 bestandenen
Messkontrollen. Die zusätzliche Bewertung vor dem Rollout muss Zug, Q, Kinder
N/W/P und Zufallsverbrauch bitgleich zur uninstrumentierten Suche lassen.
Vorzeichen, Zerlegung, Blattzahl und Q-Rekonstruktion müssen stimmen; alle Werte
endlich, Quellen einheitlich. Sonst ungültig, kein Urteil, Bericht rot; Rohdaten
werden mit always() trotzdem gesichert. Kein stiller Ausschluss einzelner Arme.

Danach werden kontrollierte Fortsetzungen separat festgelegt, falls sich eine
brauchbare Hypothese ergibt. Erst deren Endstände können etwas über erfolgreiches
Weiterspielen sagen. Kein Defaultwechsel oder neue Partien allein aus dieser Sonde.

## Kurze Prüfungen

`tests/gefangene-rollout.js` prüft Faktorplan, genaue Zählerzerlegung samt Deckel,
Aufgabeserie mit Erholung/Datenlücke, vier kurze Messkontrollen einer Einzelstellung,
Tiefe 0, fehlende Messanker und Pflichtpakete. Testsammlung und README enthalten
sie; der neue Messworkflow startet ausschließlich manuell nach Go in Actions.
