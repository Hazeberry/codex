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

Die konkrete gemeldete Datei liegt noch nicht vor. Deshalb ist nicht belegt,
dass Rückgängig die Ursache genau dieses Eintrags war. Bestehende Rohberichte
werden nicht nachträglich umgeschrieben. Für die Untersuchung eines alten
Berichts müssen Zugfolge, Rücknahmen und Diagnoseeinträge gemeinsam betrachtet
werden; gleiche Zugnummern allein belegen keine identischen Ereignisse.

Die ebenfalls gemeldete frühe Aufgabe ist damit nicht erklärt. Standardmäßig
prüft die schwere KI ab `mc >= 60` fünf eigene Züge mit `Q <= -0.95`;
die zusätzliche Gebietsschranke ist abgeschaltet (`resignAreaMargin = -1`).
Daneben existiert das Benson-Kriterium für ausschließlich todgeborene Züge.
Für eine Beurteilung der konkreten Aufgabe fehlen noch die Partie, die aktive
Konfiguration und die Aufgabemeldung. Die historische Untersuchung in
`docs/aufgaben.md` belegt keine Korrektheit einer neuen einzelnen Aufgabe.
