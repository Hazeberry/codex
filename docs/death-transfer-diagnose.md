# deathTransfer: Beitrag zu Bewertung, Q und Zugwahl

Vorabfestlegung, 06.11.2026. Auftrag: Testaufbau erstellen. Kein Messlauf gestartet.
Vor Merge liest der Eigentümer dieses Dokument; der manuelle Actions-Lauf braucht
anschließend ein ausdrückliches Go. Keine Änderung an `index.html` oder Defaults.

## Frage und Abgrenzung

`deathTransfer=1` bucht eigene bedrohte Gruppen anteilig negativ und gegnerische
positiv, gewichtet mit Größe × captureWeight × Sterberampe. Er ist eine Vorwegnahme
möglicher Gefangener. Bereits geschlagene Steine gehen separat über captures ein.
Nach einem Schlag kann Q deshalb auch ohne deathTransfer negativ bleiben.

Die historische Untersuchung (`docs/falsche-aufgabe.md`) nennt das Zusammenspiel
mit schwachen Rollouts als Ursache eines anderen Falls. Sie beweist die Ursache
unserer jüngsten Handpartien nicht. Die früher gemessenen Stärkegewinne durch
Transfer sprechen gegen eine ungeprüfte Abschaltung.

Diese erste Stufe fragt: Wie groß ist der direkte Beitrag auf identischen
Suchblättern? Wie ändern sich Q und Zugwahl bei einer tatsächlich anderen Suche?
Ein höheres Q oder weniger negative Bewertungen allein ist kein Qualitätsgewinn.

## Festgelegte Eingaben

Normalisierte Originalzugfolgen und Parameter in
`docs/daten/death-transfer/eingaben.json`, ohne Geräte-/Browserdaten:

| Partie | Stellungen nach Zug | Zweck |
|---|---|---|
| Aufgabe nach 113 | 95, 101, 113 | Vor Gruppenverlust und Aufgabestellung |
| Aufgabe nach 127 | 111, 117, 127 | Vor Gruppenverlust und Aufgabestellung |
| Alte Partie mit 494 Zügen | 85, 101 | Negative Q-Werte mit späterem Sieg als Kontext |

Rekonstruktion aus Originalzügen, nicht aus teilweise doppelten Diagnosezeilen.
Vor jeder Messserie müssen die drei vollständigen Originalverläufe exakt das
Referenzbrett und dieselben Gefangenen ergeben; Besetzung, Suizid, Ko und Superko
werden geprüft. Komi und Wertungsart sind für diese Engine-Abfragen keine Eingabe;
insbesondere wird der alte Territory-Endstand nicht mit Chinese-Endständen vermischt.

## Paarung und Umfang

Drei Dosen: **0 / 0,5 / 1 (Default)**. Alle anderen Bewertungsparameter bleiben wie
im Bericht, insbesondere captureWeight=20 und mctsValueScale=200. Aufgabe aus,
adaptives Budget aus, feste Simulationen 120 und 3000; kein Orakel, keine Vorgabe.
Jede Stellung wird zusätzlich mit vertauschten Farben und Gefangenen geprüft:
die ursprüngliche weiße KI spielt dann Schwarz auf demselben Brett. Das ist keine
geometrische Spiegelung und kein neues Duell.

Seeds 741 und 742 je Kombination; frische Suche ohne Baumübernahme. Keine
Wiederholung der ursprünglichen Handy-Suche, deren Zufall und Baum unbekannt sind.
Getrennte Node-Prozesse je Abfrage und je Messkontrolle.

8 Stellungen × 2 Farben × 2 Budgets × 2 Seeds × 3 Dosen = **192 Abfragen**.
Jede Abfrage zusätzlich ohne Bewertungsprotokollierung: insgesamt **384 Suchen**.
32 Pakete mit jeweils sechs Dosis-/Seed-Abfragen und sechs Kontrollen, maximal acht
Jobs parallel. Pro Worker 120 Sekunden, Rechenschritt 27 Minuten, Job 35 Minuten,
mit reserviertem Artefakt-Upload. Laufzeit und Kosten sind vor dem ersten Lauf
nicht kalibriert. Kein automatischer Wiederanlauf und keine automatische Fortsetzung.

## Messung

Nur die im Messprozess geladene Kopie des Worker-Codes erhält geprüfte Messanker.
Die ausgelieferte Engine-Datei bleibt unverändert. Je evaluateBoard-Aufruf:

- rohe Gesamtbewertung;
- tatsächlicher Gefangenenterm nach eventuellem Deckel;
- vorzeichenrichtiger Netto-Beitrag von deathTransfer;
- Rest = Gesamt − Gefangene − Transfer.

Je Simulation werden Wurzelzug und skalierter Blattwert gespeichert. Für den
gewählten Zug muss der Mittelwert seiner Blattwerte Q exakt bis 1e-12 erklären.
Ohne Baumübernahme sind keine früheren, unprotokollierten Besuche enthalten.
Die tatsächlich besuchten Blätter werden zusätzlich mit `tanh((Gesamt−Transfer)/200)`
bewertet. Das isoliert den direkten Beitrag auf denselben Stellungen, ist aber
**keine Suche ohne Transfer**. Die echten Dosisarme dürfen andere Bäume besuchen;
gleicher Seed erzwingt nach einer Abweichung keine identischen Fortsetzungen.

Alle Rohblätter, Wurzelkinder mit N/W/P, gewählter Zug, ungerundetes Q,
Zufallsverbrauch, Eingabe-/Engine-SHA-256 und Quellen-Commit werden gesichert.

## Endpunkte und Entscheidung

Primär: Q(Dosis 0) − Q(Dosis 1) je gepaarter Stellung/Farbe/Budget/Seed und die
Differenz der Blattmittel mit bzw. ohne Transfer für den gewählten Default-Zug.
Sekundär: Dosis 0,5, geänderter Zug, Rohbeiträge vor/nach dem Schlag,
Überschreiten von Q ≤ −0,95. Letzteres ist keine rekonstruierte Fünf-Züge-Serie.
Keine Gewinnwahrscheinlichkeit aus Q ableiten.

Der Bericht zeigt Einzelwerte und Farbpaarungen. Die acht gezielt gewählten,
abhängigen Stellungen sind keine Zufallsstichprobe: keine Signifikanztests,
keine Siegquote, kein Elo und keine Änderungsempfehlung allein aus Q.
Ein kleiner direkter Effekt in der Wurzel schließt einen großen Effekt in
Rollout-Stellungen nicht aus. Ein Q-Anstieg belegt keine gerettete Gruppe.

**Gültig** nur bei 32 vollständigen Paketen, 192 Messabfragen, bestandenen 192
Messkontrollen (Zug, Q, Kinder N/W/P und Zufallsverbrauch bitgleich), endlichen
Werten, korrekter Blattzahl und Zerlegung sowie einheitlichen Quellen.
Sonst **ungültig: kein Urteil**, Berichtsschritt rot. Keine stillschweigende
Teilauswertung fehlender Dosen/Farben/Seeds; vorhandene Rohdaten bleiben erhalten.

## Nächste Stufe

Kontrollierte Fortsetzungen mit Default/halber/ausgeschalteter Dosis prüfen erst
danach, ob eine veränderte Bewertung bessere Züge und Endstände liefert. Diese
Partien gehören nicht zu diesem Workflow. Gegner, Umfang und Bewertungsregel
werden vor einem eigenen Go anhand der Diagnose festgelegt. Der jetzige Aufbau
ändert keine Spielparameter und rechtfertigt noch keine Abschaltung des Terms.

## Kurze Prüfungen des Aufbaus

`node tests/death-transfer-diagnose.js`: Originalrekonstruktion, Farbpaarung,
Abbruch bei verändertem Messanker, bekannte vorzeichenrichtige Transferrechnung,
Bitgleichheit einer Einzelstellung mit vier Simulationen je Prozess und Abbruch
bei fehlenden Pflichtpaketen. Eingetragen in Testsammlung und Tests-README.
Die CI führt nur diese kurzen Prüfungen aus; der Messworkflow startet ausschließlich
manuell in GitHub Actions nach Go.
