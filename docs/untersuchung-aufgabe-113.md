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
