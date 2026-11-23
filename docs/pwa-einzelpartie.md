# Einzelpartie Engine gegen PWA (06.11.2026)

Auftrag des Eigentümers: eine Partie gegen die PWA. Verwendet wird die von ihm
bereitgestellte Archivfassung `vergleich/pwa-index.html`, SHA-256
`9100c565458b84bac71d8de308e8c064b53de37269bf725e7696ba30a838e685`.

**Ergebnis: aktuelle Engine (Weiß) gewinnt mit W+6,5 nach 346 Zügen.**
Zwei Schluss-Pässe, keine Aufgabe, kein Zuglimit, kein Schiedsrichter-Neustart.
GNU Go 3.8, Stufe 1, zählt nach chinesischen Regeln. Die eigene Flächenzählung
stimmt mit: Schwarz 181, Weiß einschließlich Komi 187,5. Beide Seiten schlagen
je 24 Steine.

Bedingungen: beide Seiten „hard“, 120 feste Simulationen je Zug, Aufgabe aus,
adaptives Budget aus, keine Vorgabe, Komi 7,5. Seed-Basis 613, tatsächlicher
Engine-Seed 61300001; Gegner im eigenen Prozess mit Seed +80000.
Quellstand `90b0e3e52cd28c48ff512d8d15220cef30094da6`.
[Spiel-Lauf 42242456834](https://github.com/Hazeberry/codex/actions/runs/42242456834).

Die Partie wurde genau einmal gespielt. Im nachgeschalteten Export wurde ein
Formatfehler gefunden (Gegnerparameter als Text statt Objekt). Der ursprüngliche
Actions-Lauf ist deshalb rot, obwohl die Partie vollständig ist. Der korrigierte
Exporter arbeitet auf derselben unveränderten Rohdatei; keine Wiederholung der
Partie. Das originale Artefakt und sein gegen GitHub geprüfter Digest sind gesichert.

[SGF zum Nachspielen](daten/pwa-einzelpartie/lauf1/partie.sgf),
[Rohpartie](daten/pwa-einzelpartie/lauf1/partie.jsonl),
[Herkunft und Prüfsummen](daten/pwa-einzelpartie/lauf1/manifest.json).

Diese Partie ist Anschauungsmaterial. Aus einem einzelnen Sieg folgt kein
belastbarer Vergleich der Spielstärke und keine Erklärung falscher Aufgaben.
Die historische größere Messung steht in `pwa-vergleich.md`.
