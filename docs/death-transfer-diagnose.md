# deathTransfer: Beitrag zu Bewertung, Q und Zugwahl

Vorabfestlegung, 06.11.2026. Auftrag: Testaufbau erstellen. Inzwischen nach Go
ausgeführt; Ergebnis und Quellenbelege im Nachtrag unten.
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

## Ergebnis des freigegebenen Laufs (06.11.2026)

Go für Merge und Diagnose nach Durchsicht von PR #12. Merge/Quellstand
`8ad41af0c0e67da49b6caf8653c3bd5695d44960`.
[Lauf 42256206462](https://github.com/Hazeberry/codex/actions/runs/42256206462):
**gültig**, 32/32 Pakete, 192/192 Messabfragen, 192/192 Messkontrollen bestanden.
Alle 34 Jobs grün, keine Timeouts, keine Wiederholung. Sämtliche Farbpaare liefern
hier exakt dieselben Q-Werte. Das ersetzt keine Abdeckung anderer Stellungen.

Vollständiges unverändertes Actions-Artefakt, inklusive aller Suchblätter und
Kontrollbelege, unter `docs/daten/death-transfer/lauf1/death-transfer-gesamt.zip`.
SHA-256 gegen GitHubs Digest geprüft; `manifest.json` sichert Quelle, Eingaben
und Engine. Der unveränderte Maschinenbericht steht daneben in `bericht.json`.

### Q bei 3000 Simulationen, ursprüngliche Weiß-Perspektive

Spannen über die zwei festgelegten Seeds, auf vier Nachkommastellen gerundet:

| Partie, Stellung nach Zug | Transfer 0 | Transfer 0,5 | Transfer 1 |
|---|---:|---:|---:|
| 113, nach 95 | +0,3179 bis +0,3229 | +0,3179 bis +0,3229 | +0,3179 bis +0,3229 |
| 113, nach 101 | −0,9224 bis −0,9217 | −0,9255 bis −0,9254 | −0,9325 bis −0,9317 |
| 113, nach 113 | −0,9576 bis −0,9574 | −0,9577 bis −0,9575 | −0,9576 bis −0,9574 |
| 127, nach 111 | +0,5209 bis +0,5216 | +0,5209 bis +0,5216 | +0,5209 bis +0,5216 |
| 127, nach 117 | −0,9358 bis −0,9344 | −0,9373 bis −0,9356 | −0,9411 bis −0,9410 |
| 127, nach 127 | −0,9553 bis −0,9553 | −0,9553 bis −0,9553 | −0,9553 bis −0,9553 |
| Alt 494, nach 85 | −0,9320 bis −0,9319 | −0,9436 bis −0,9436 | −0,9528 bis −0,9522 |
| Alt 494, nach 101 | −0,1151 bis −0,1125 | −0,1140 bis −0,1128 | −0,1147 bis −0,1126 |

Gerundete gleiche Grenzen können ungerundet verschieden sein; die Einzelwerte
stehen im Maschinenbericht. Für die beiden Aufgabestellungen gilt auch bei
120 Simulationen und beiden Farben: Q bleibt in allen Dosisarmen unter −0,95.
In allen **64/64** gepaarten Kontexten bleibt der gewählte Zug zwischen Dosis 0
und 1 gleich. Aus dieser gezielten kleinen Auswahl folgt keine allgemeine
Wirkungslosigkeit des Terms und kein Gleichstand der Spielstärke.

### Wo das negative Q entsteht

**Partie 127 nach Zug 127:** In der Wurzel ergeben sich −400 aus bereits
gebuchten Gefangenen, 0 aus Transfer und +15 aus den übrigen Termen, zusammen
−385. In den Blättern des gewählten Default-Zugs (3000 Simulationen, Seed 741)
bleibt der Gefangenenterm bei −400; Transfer ist 0, der Rest im Mittel +22,00.
Q ist −0,95527. Ohne Transfer ist Q bei diesem Seed exakt gleich.

**Partie 113 nach Zug 113:** Wurzel: Gefangene −440, Transfer 0, Rest +8,
Gesamt −432. In den Default-Blättern desselben Seeds: Gefangene im Mittel
−427,52, Transfer −0,02, Rest +43,40, Q −0,95756. Ohne Transfer erreicht die
neue Suche Q −0,95755. Transfer ist hier als unmittelbarer Beitrag praktisch null.

**Vor dem Schlag ist die Trennung wichtig:** Nach Zug 101 der ersten Partie
verschiebt Transfer die Wurzelbewertung um −340 (−80 Gefangene, +164 Rest).
Ohne Transfer wäre diese statische Wurzelbewertung +84, mit ihm −256.
Die Suchblätter enthalten aber häufig schon die in der Simulation geschlagenen
Steine: Gefangenenterm im Default-Zug im Mittel −386,26, Transfer nur noch −18,85.
Der Wert verschwindet beim Abschalten des Transfers deshalb nicht einfach.

An denselben Default-Blättern würde das nachträgliche Herausrechnen des Transfers
Q von −0,93170 auf −0,85856 heben. Die tatsächlich neu gerechnete Suche ohne
Transfer erreicht dagegen −0,92243. Das sind unterschiedliche Größen: veränderte
Bewertung derselben Blätter gegenüber einer veränderten Suche mit anderen Blättern
und Besuchsgewichten. Mittelwerte der Rohterme werden nicht erst nach dem Mitteln
mit tanh skaliert; Q ist der Mittelwert der bereits skalierten Blattwerte.

**Historische Stellung nach Zug 85:** Der Transferbeitrag ist an der Wurzel 0,
in den Blättern des gewählten Zugs aber im Mittel −43,81 (Seed 741). Q liegt mit
Default bei −0,95216, auf denselben Blättern ohne Transfer bei −0,93220; die neue
Suche ohne Transfer erreicht −0,93203. Hier trägt Transfer direkt zum Überschreiten
der Schwelle bei. Das ist eine einzelne Abfrage, keine nachgewiesene Aufgabenserie.

Über die 64 ausgewählten Kontexte liegt Q mit Dosis 0 bzw. 0,5 in je 16 Fällen
unter oder gleich −0,95, mit Dosis 1 in 24 Fällen. Die zusätzlichen acht Fälle
sind dieselbe historische Stellung mit Farben, Budgets und Seeds; keine acht
unabhängigen Partien und keine geschätzte Quote falscher Aufgaben.

### Schluss für die nächste Untersuchung

Die beiden aktuellen Aufgabestellungen werden durch Abschalten von deathTransfer
nicht aus dem negativen Q-Bereich geholt. Die direkte Übertragung ist dort nicht
der dominante Term; bereits gebuchte Gefangene dominieren. Vor einem Schlag und
in anderen Rollout-Stellungen kann der Transfer Q hingegen deutlich beeinflussen.

Eine alleinige Abschaltung wäre als Korrektur dieser beiden Aufgabestellungen
nicht durch die Diagnose gestützt. Die nächste sinnvolle Frage betrifft das
Zusammenspiel von tatsächlichem Gefangenenterm, Rollout-Verlusten und Skalierung
sowie die Verlässlichkeit des Q-Kriteriums für Aufgabe. Ob andere Spielzüge frühere
Gruppenverluste verhindern, wurde nicht untersucht. Neue Fortsetzungen oder eine
Änderung der Spielparameter benötigen weiterhin eine eigene Vorabfestlegung und Go.
