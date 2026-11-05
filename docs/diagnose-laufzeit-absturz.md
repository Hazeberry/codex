<!--
Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
-->
# Diagnose: lange Partien gegen Fuego und GNU-Go-Absturz

**Abgeschlossen, gültig (05.11.2026).** Alle sechs Pflichtreproduktionen sind bestanden.
Quelle: [Lauf 42130235314, Versuch 2](https://github.com/Hazeberry/codex/actions/runs/42130235314/attempts/2),
unter Übernahme der bestandenen Fälle aus Lauf 42124976320.
Der unveränderte [Actions-Bericht](daten/diagnose-laufzeit-absturz/lauf1/bericht.md)
und die Rohdaten liegen unter `docs/daten/diagnose-laufzeit-absturz/lauf1/`.

## Anlass und Quellen

Untersucht werden zwei technische Auffälligkeiten des Vierarm-Hauptlaufs
41627980348 im ursprünglichen Repository `Hazeberry/Go-html-Game-MoE`:
die langen Partien gegen Fuego und der GNU-Go-Absturz in Partie 127 aller vier Arme.
Grundlage sind `docs/kandidaten-orakel-vierarm.md` §14 und die dort archivierten Rohdaten.
Hazeberry hat die Untersuchung in dieser Sitzung ausdrücklich freigegeben.

Die Reproduktionen laufen ausschließlich in GitHub Actions in `Hazeberry/codex`.
Verwendet wird der historische Spielstand
`8740574aa6f3d572b1d234d58202008d71404fb2`; die Quellhashes von Engine, Harness und
Lebensurteil-Modul werden gegen die damaligen Paketmetadaten geprüft.
Die Instrumentierung ergänzt Zeit- und GTP-Protokolle in einer temporären Harness-Kopie.
`index.html` und der produktive Messrahmen werden nicht geändert.

Ausgewählt wurden vor der Reproduktion: GNU Go Nr. 127 in A/N/P/S und die jeweils
längste archivierte Partie gegen Fuego in P und S. Letztere ist in beiden Armen Nr. 27.
Dies ist eine Diagnose ausgewählter Fälle, keine neue Messung der Spielstärke.

## Laufzeitbefund im historischen Archiv

Auch die Maxima von A und N liegen jeweils in Partie 27:

| Arm | Gesamtdauer s | Orakelabfragen s |
|---|---:|---:|
| A | 524,9 | 488,9 |
| N | 506,6 | 464,8 |
| P | 1117,8 | 1091,9 |
| S | 1112,3 | 1074,9 |

Quelle: Actions-Archivplan (`fuegoMaxima`), aus `kandidatenOrakel.partieMs` und
`kandidatenOrakel.abfrageMs`. Die historischen Zeitwerte trennen keine einzelnen
Orakelabfragen auf. Sie zeigen bereits, dass deren Wartezeit den Hauptanteil ausmacht.
Die Auffälligkeit tritt auch in den Armen ohne Prior-Anhebung auf.

## Reproduktion der langen Fuego-Partien

Die vollständigen Zugfolgen und Endstände werden exakt gegen das Archiv geprüft.
Gesamtsekunden müssen auf einem anderen Runner nicht übereinstimmen.

Beide Partien reproduzieren Zugfolge und Endstand exakt: P mit 282 Zügen und S mit
374 Zügen. Die Zeitzerlegung der instrumentierten Wiederholungen:

| Arm | Gesamtdauer s | Orakelabfragen s | unsere KI s | Fuegos Zugberechnung s |
|---|---:|---:|---:|---:|
| P | 783,7 | 766,6 | 8,1 | 8,3 |
| S | 1198,5 | 1160,6 | 18,9 | 17,9 |

P enthält 101 Orakelabfragen und je 141 KI-/Gegnerzüge; S enthält 147 Orakelabfragen
und je 187 KI-/Gegnerzüge. Die langsamste einzelne Orakelabfrage dauert 262,5 s in P
und 401,2 s in S. Fuegos langsamste Zugabfragen dauern 0,100 s bzw. 0,163 s.
Die Endwertung durch GNU Go dauert 0,164 s bzw. 0,062 s.

Die Wiederholungen liefen auf verschiedenen Runnern. Ihre Laufzeitdifferenz ist
kein gemessener Armeffekt. Für die beiden ausgewählten Fälle ist der dominante
Zeitanteil bei den GNU-Go-Orakelabfragen bestätigt.

Die größten Orakelabfragen der S-Reproduktion:

| vor KI-Zug | Orakelantwort | Dauer s |
|---|---|---:|
| 88 | S5 | 401,2 |
| 84 | Q5 | 283,0 |
| 86 | R5 | 194,2 |
| 82 | Q6 | 152,5 |
| 90 | L15 | 21,2 |

Diese Werte grenzen den Zeitanteil auf wenige `reg_genmove`-Abfragen an GNU Go
Stufe 10 ein. Welche interne GNU-Go-Lesefunktion die Zeit verbraucht, wurde damit
noch nicht ermittelt. Aus der Diagnose folgt keine Änderung der Orakelstufe oder
der Spielbedingungen des abgeschlossenen Vierarm-Versuchs.

## GNU-Go-Absturz: gemeinsame Stellung nach dem ersten Eingriff

Alle vier Wiederholungen erreichen dieselbe Zugfolge bis einschließlich Zug 82.
Die letzten vier Züge sind Schwarz K10, Weiß L10, Schwarz K9, Weiß K8.
Danach stürzt GNU Go Stufe 1 bei `genmove B` mit SIGSEGV ab.

Der erste Orakel-Auslöser liegt bereits bei `mc=81`, vor dem 82. Zug der Partie:
Fall d, Orakelzug D13, Rang 59. Die Arme unterscheiden sich wie vorgesehen:

| Arm | Orakelzug aufgenommen | Prior angehoben | gespielter KI-Zug |
|---|---|---|---|
| A | nein | nein | K8 |
| N | ja | nein | K8 |
| P | nein | nein | K8 |
| S | ja | ja | K8 |

**Korrektur der bisherigen Vermutung:** Eine gemeinsame erreichte Stellung ist in
den Wiederholungen bestätigt. Sie liegt jedoch nach dem ersten Eingriff in N und S.
Die geänderten Suchbedingungen führen an dieser Stelle zum selben gespielten Zug.

Der im Harness vorgesehene Neustart mit anderem Seed erreicht dieselbe Stellung
und stürzt ebenfalls ab. Zusätzlich reproduziert ein eigenständiger GNU-Go-Prozess
unter GDB den SIGSEGV mit der ursprünglichen GTP-Befehlsfolge, ohne unsere KI oder
ein Orakel auszuführen. Die Folge steht als `repro.gtp` bei den Rohdaten von A.

Der Backtrace enthält für GNU Go nur Adressen ohne Funktionsnamen. Der konkrete
Fehler im GNU-Go-Quellcode ist daher nicht identifiziert. Auch die Rolle von
Zughistorie und internem Zufallszustand wurde nicht vollständig voneinander getrennt.

## Technischer Ablauf und Gültigkeit

Lauf 42124976320 sicherte drei erfolgreiche Reproduktionen; drei andere Jobs wurden
nach langer Vorbereitung vor dem Partiestart beendet. Dieser Gesamtlauf ist
unvollständig und liefert **KEIN URTEIL** über die vollständige Diagnose.

Die Fortsetzung 42130235314 übernimmt nur bestandene Fälle mit passendem Archivplan,
Fallmetadaten und Pflichtrohdaten sowie identischem Reproduktionscode. Berichtscode
wird gesondert behandelt; beide vollständigen Quellhashes und der verglichene
Reproduktions-AST-Hash werden in `fortsetzung.json` protokolliert.

In der Fortsetzung scheiterte zunächst nur die Paketinstallation von Fuego P am
eingestellten Zeitlimit; die Partie wurde dabei nicht begonnen. Nur der fehlgeschlagene
Job und der Bericht wurden auf einem frischen Runner wiederholt. Erfolgreiche Fälle
wurden nicht als neue Partien nachgerechnet.

**Versuch 2 der Fortsetzung ist grün und der Bericht gültig:** vier erwartete
Abstürze reproduziert, beide vollständigen Fuego-Partien mit identischer Zugfolge
und identischem Endstand reproduziert, alle sechs Ergebnis- und Rohprotokolle
vorhanden. Die vier erwarteten Partieabbrüche sind bestandene Absturzreproduktionen;
sie sind keine regulär beendeten Partien.

Die Ergebnis-Sicherung verwendet das jüngere Artefakt `diagnose-gesamt`, ID
`13463817294` (erstellt 05.11.2026 23:52:04 UTC). Im selben Lauf existiert auch ein
älteres, unvollständiges Artefakt gleichen Namens. Der SHA-256 des ausgewählten ZIPs
wurde vor dem Entpacken gegen die GitHub-Metadaten geprüft:
`141e6b989688d8fa339e2f9089dfb770f1cf95e8d56491ca4a8dbb8ab841e617`.
JSON-Dateien und Actions-Bericht sind unverändert übernommen; Trace- und Logdateien
sind verlustfrei gzip-komprimiert. `artefakte.json`, `vorlauf.json`, `versuch1.json`,
`versuch2.json` und `sha256.txt` dokumentieren Herkunft, Laufzustände und Dateihashes.

Der zusätzlich vorbereitete reine Berichtsmodus aus PR #5 wurde nicht gestartet:
Der bestehende Bericht war bereits erfolgreich gesichert. Es wurden keine weiteren
Partien oder Berichtsläufe benötigt.

Eine Berichtskorrektur trennt die untersuchte Stellungsgleichheit von den technischen
Gültigkeitsprüfungen: Auch unterschiedliche erreichte Stellungen wären ein zulässiges
Untersuchungsergebnis. Fehlende oder nicht passende Pflichtreproduktionen bleiben
ein Grund für **KEIN URTEIL**.

## Weiter offen

- Der genaue GNU-Go-Quellcodefehler hinter dem SIGSEGV.
- Die interne Ursache der besonders teuren GNU-Go-Orakelabfragen.
- GNU-Go-Verwandtschaft als Erklärung der gemessenen Spielstärkegewinne: Orakel,
  Netz-/Musterdaten und Wertung wurden hier nicht gegeneinander variiert.
- Nutzen einer internen Prior-Anhebung ohne Orakel: Die Vorabfestlegung steht in
  `prior-anhebung-ohne-orakel.md`; dieser Versuch wurde nicht durchgeführt.
