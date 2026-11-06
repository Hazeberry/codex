# KI-Diagnose nach Rückgängig

Bei der Prüfung des gemeldeten doppelten Eintrags bei Zug 42 wurde eine
Fehlerquelle im Browser-Protokoll gefunden: `undo()` setzte Zugliste und
Textprotokoll zurück, behielt aber `state.aiDiag` vollständig bei. Wird die
zurückgenommene Zugnummer erneut erreicht, können dort Einträge verschiedener
Spielverläufe dieselbe Zugnummer tragen.

Die Undo-Sicherung merkt sich jetzt auch die Länge der KI-Diagnose. Beim
Zurücknehmen wird diese Länge wiederhergestellt. Frühere Einträge bleiben
erhalten; zurückgenommene Einträge gehören nicht mehr zum exportierten Verlauf.
Der Browser-Regressionsfall nimmt Zug 42 zurück und spielt ihn erneut.

Der nachgereichte Bericht `warumnewfile.txt` (06.11.2026, 05:01:26 UTC) enthält
bei Zug 42 zwei verschiedene Einträge: P14 mit 2945 Simulationen/Q −0,01 und
P13 mit 2915 Simulationen/Q −0,14. In Zugprotokoll und zugehöriger SGF
`go_113zuege_1793941280844.sgf` steht ausschließlich P13 (`W[og]`). P14 gehört
somit nicht zum gespeicherten Verlauf. Das passt zur Rückgängig-Lücke; eine
explizite Historie der Bedienaktionen enthält der Bericht nicht. Die Rohdaten
werden nicht nachträglich umgeschrieben oder beide Einträge als Wiederholung
derselben Suche behandelt.

Die ebenfalls gemeldete frühe Aufgabe ist damit nicht erklärt. Standardmäßig
prüft die schwere KI ab `mc >= 60` fünf eigene Züge mit `Q <= -0.95`;
die zusätzliche Gebietsschranke ist abgeschaltet (`resignAreaMargin = -1`).
Daneben existiert das Benson-Kriterium für ausschließlich todgeborene Züge.
Diese Parameter sind auch im nachgereichten Bericht aktiv. Nach Schwarzes
Zug 113 gibt Weiß auf: „Q -0.96 über 5 Züge in Folge · Fläche 34:86 (roh 34:86)“.
Es handelt sich um die Q-basierte Aufgabe. Die Anzeige rundet Q auf zwei
Nachkommastellen; aus angezeigtem −0,95 allein lässt sich das Erreichen der
internen Schwelle nicht rekonstruieren.

Eine reine Rekonstruktion der SGF mit Schlagregeln (ohne KI-Suche) ergibt
nach allen 113 Zügen exakt das Brett des Berichts und dieselben Gefangenen:
Schwarz hat 22 Steine geschlagen, Weiß keinen. Bei Zug 103 (Schwarz P15)
werden 17 weiße Steine geschlagen. Die Schlussstellung enthält 57 schwarze,
34 weiße Steine und 270 leere Punkte.

Die protokollierte Bewertung fällt von +0,32 bei Weiß 96 über −0,02 bei 98,
−0,36 bei 100 und −0,93 bei 102 auf ungefähr −0,95/−0,96 danach. Die KI erkennt
die Gefahr damit vor dem tatsächlichen Schlagzug, aber erst spät im Verlauf
der Einschließung. Ob eine Rettung oder bessere Zugwahl zuvor möglich war,
ist durch diesen Protokollabgleich nicht geprüft.

Die Aufgabe entspricht dem dokumentierten Mechanismus. Ihre spielerische
Berechtigung ist damit nicht bewiesen: Q ist keine kalibrierte Gewinnchance,
34:86 ist eine interne Flächenschätzung, kein unabhängiges Endergebnis. Für
die Frage nach einer zu frühen Aufgabe fehlt eine unabhängige Bewertung bzw.
kontrollierte Fortsetzung der Stellung. Die historische Untersuchung in
`docs/aufgaben.md` entscheidet diesen Einzelfall nicht.

Nachtrag: Die inzwischen ausgeführte externe Bewertung und sechs Fortsetzungen
sprechen in diesem Einzelfall deutlich für eine voreilige Aufgabe. Alle sechs
Fortsetzungen gewinnt Weiß; siehe `untersuchung-aufgabe-113.md`. Der ursprüngliche
Protokollabgleich allein konnte diese Frage nicht entscheiden.
