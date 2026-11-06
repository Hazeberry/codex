# Einzelfall: Gruppe verloren, Aufgabe nach Zug 113

Go des Eigentümers vom 06.11.2026 nach Sichtung der beiden eingesandten Dateien.
Keine Änderung am Spiel. Messungen ausschließlich in GitHub Actions.

## Vorabfestlegung

Eingabe: `docs/daten/aufgabe-113/partie.sgf`, dazu ein Auszug des Fehlerberichts
(Brett, Gefangene, Parameter und Diagnose; ohne Browser-/Gerätemetadaten).
Originalbericht über SHA-256 identifiziert. SGF endet nach Schwarz 113, Weiß am Zug.

1. GNU Go 3.8, Stufen 1 und 10: Bewertung nach Zug 79, 85, 89, 91, 93, 95,
   97, 99, 101, 103 und 113. Jeweils `estimate_score`, Weiß-Vorschlag mit
   `reg_genmove`, Schätzung nach Archivzug und Vorschlag. 22 Stellungsauswertungen.
   Diese unmittelbaren Schätzungen sind weder Rettungsbeweis noch exakte Zugwerte.
2. Sechs Fortsetzungen ab Zug 113: Weiß eigene KI mit 120 bzw. 3000 festen
   Simulationen sowie GNU Go Stufe 10; Schwarz immer GNU Go Stufe 1.
   Je Variante Seeds 611/612. Originalparameter der KI, mit Aufgabe aus und
   adaptivem Budget aus. Kein Orakel für die eigene KI. Keine Vorgabe, Komi 7,5,
   chinesische Regeln. Ende nach zwei Pässen; maximal 600 weitere Züge.
   Endstand durch GNU Go Stufe 1, mit vollständigen Zuglisten und GTP-Protokollen.
3. Jeder Prozess startet frisch. Das ist keine bitgleiche Wiederholung der
   Handypartie: ursprünglicher Zufall, Suchbaum und Zeitbudget sind nicht reproduziert.
   3000 Simulationen nähern nur die protokollierte Suchmenge an.

Primäre Beobachtungen: Vorzeichen und Verlauf der externen Schätzungen; Endstand
jeder Fortsetzung aus Weißsicht. Keine Signifikanztests oder Spielstärkeaussagen
bei zwei Seeds einer einzelnen Stellung; Farben bleiben wegen der konkreten
Fragestellung fest. Ein Weißsieg belegt eine gewonnene Fortsetzung gegen diesen
Gegner, nicht optimale Spielbarkeit; eine Niederlage beweist keine Zwangsniederlage.
GNU Go ist ein anderes Programm, aber wegen Trainingsdaten und Wertung keine
vollständig unabhängige Referenz für sämtliche systematischen Fehler.

Gültig nur bei exakt passendem Ausgangsbrett, 22 vollständigen Stellungsauswertungen,
sechs beendeten Fortsetzungen, übereinstimmenden Schlussbrettern beider Prozesse,
lesbarem Endstand und ohne GTP-Fehler/Aufgabe/Timeout. Sonst kein Gesamturteil,
Lauf rot; Teilbefunde bleiben als solche gekennzeichnet. Pro GTP-Antwort 120 Sekunden,
pro Job 35 Minuten mit reserviertem Artefakt-Upload, kein automatischer Wiederanlauf.

Der erste Lauf wird durch einen ausdrücklich gepushten Startmarker auf dem
Untersuchungsbranch ausgelöst (Go oben); weitere Änderungen starten ihn nicht.
Vor Merge dieses neuen Untersuchungsdokuments liest der Eigentümer es gemäß CLAUDE.md.

## Ergebnis (06.11.2026)

[Actions-Lauf 42169766921](https://github.com/Hazeberry/codex/actions/runs/42169766921),
Quellenstand `09cdb2be87d693f6eb89a190274e7e49f5769b9a`: **gültig**.
Alle sieben Jobs grün, 22/22 Stellungsauswertungen und 6/6 vollständige
Fortsetzungen. Ausgangsbretter stimmen mit dem Bericht überein, die
Schlussbretter beider GTP-Prozesse stimmen überein. Keine Aufgabe, kein Timeout,
kein Zugdeckel. Sieben unveränderte Artefakt-ZIPs mit gegen GitHubs Digest
geprüftem SHA-256 unter `docs/daten/aufgabe-113/lauf1/`; Manifest benennt Quelle
und Prüfsummen. GNU Go 3.8.

### Fortsetzung der Aufgabestellung

| Weiß gegen GNU Go 1 (Schwarz) | Seed | weitere Züge | Endstand (GNU Go 1) |
|---|---:|---:|---:|
| Eigene KI, 120 Simulationen | 611 | 92 | W+138,5 |
| Eigene KI, 120 Simulationen | 612 | 86 | W+138,5 |
| Eigene KI, 3000 Simulationen | 611 | 155 | W+72,5 |
| Eigene KI, 3000 Simulationen | 612 | 115 | W+136,5 |
| GNU Go 10 | 611 | 69 | W+138,5 |
| GNU Go 10 | 612 | 58 | W+144,5 |

**In allen sechs Fortsetzungen gewinnt Weiß.** Die eigene KI kann also nach
dieser Aufgabe mit ausgeschalteter Aufgabe gegen den festgelegten Gegner
gewinnen, auch bei ungefähr der ursprünglichen Suchmenge. Die Variation
zwischen Seeds ist keine belastbare Aussage über den Nutzen von mehr Suche.

### Externe Bewertung vor und nach dem Gruppenverlust

GNU Go 1 und 10 liefern hier dieselben Schätzungen vor dem weißen Zug:

| nach Zug | Schätzung aus Weißsicht |
|---|---:|
| 79 | +189,6 |
| 85 | +168,8 |
| 89 | +163,3 |
| 91 | +143,2 |
| 95 | +160,7 |
| 101 | +166,1 |
| 103 (17 weiße Steine geschlagen) | +174,8 |
| 113 (Aufgabestellung) | +164,9 |

Die obere und untere Schätzgrenze steht vollständig im Rohprotokoll. Diese
Werte sind heuristische Mittelspielschätzungen, keine exakten Endstände.
Insbesondere bleibt die Schätzung von nach Weiß 102 zu nach Schwarz 103
unverändert bei W+174,8: GNU Go hatte den Verlust bereits eingerechnet.

Ein konkreter früherer Kandidat ist Weiß 90: Archiv J16 ergibt W+168,5,
GNU-Gos Vorschlag K18 ergibt W+190,5. Das ist ein Unterschied unmittelbarer
Schätzungen, kein Beweis einer geretteten Gruppe. Ab der Stellung nach Zug 91
empfiehlt GNU Go hier P3 statt weiterer Züge in der später verlorenen Gruppe.

Zusätzlicher reiner Brettabgleich ohne Suche: Die verbundene 17-Steine-Gruppe
hat nach Schwarz 99 zwei Freiheiten (N17/P15), nach Schwarz 101 nur P15.
Weiß P15 wäre dort **Suizid**: kein Schlag, danach 18 eigene Steine ohne
Freiheit. Weiß 102 anderswo ist daher kein Beleg für ein übersehenes legales
Entkommen aus Atari. Ob die Gruppe früher zu retten war, bleibt offen.

### Einordnung und offene Ursache

Die anfängliche Vermutung, der Gruppenverlust mache die Aufgabe plausibel,
wird durch die externe Bewertung und die Fortsetzungen nicht gestützt.
Für diesen Einzelfall sprechen die Befunde deutlich für eine voreilige Aufgabe.
Das ist stärker als eine bloße andere Flächenschätzung, denn auch die eigene
KI gewinnt die tatsächlich ausgespielten Fortsetzungen. Es ist kein Beweis
optimalen Spiels oder einer sicheren Fortsetzung gegen den menschlichen Gegner.

Die technische Ursache der stark negativen Q-Werte ist weiter offen. Der
zeitliche Zusammenhang mit der eingeschlossenen Gruppe beweist keinen einzelnen
Fehler in Rollout, Bewertung oder Suche. Die ähnliche historische Diagnose in
`docs/falsche-aufgabe.md` ist eine Arbeitshypothese für den nächsten Schritt,
keine Übertragung ihres Ursachennachweises auf diese Partie. Keine Änderung
an Aufgabe-Q, Streak, Bewertung oder Spieldefaults wurde vorgenommen.
