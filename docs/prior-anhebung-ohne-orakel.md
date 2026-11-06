<!--
Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
-->
# Prior-Anhebung ohne Orakel – Vorabfestlegung (Entwurf)

Vorabfestlegung vom 05.11.2026; Umsetzung mit Go in der Sitzung vom 06.11.2026.
Konkretisierung in §10 mit anschließendem Go. Ergebnisse von Engine-Vergleich und
technischer Probe in §11/12; Wirkung und Hauptlauf bleiben offen.
Ziel-Repository: `Hazeberry/codex`.

## 1. Grundlage und Frage

Grundlage: HANDOFF.md, Commit `818ba2a54763a9977b802f48b74b9f41aaee868b`, Abschnitt
„Nutzung ohne Orakel“, sowie `docs/kandidaten-orakel-vierarm.md`, §14.
Der Vierarm-Versuch fand für P − A +13,8 Punkte gegen GNU Go und +11,7 gegen Fuego.
P verwendete GNU Go zur Zugauswahl. Daraus folgt keine bereits bekannte interne Auswahlregel.

Neue Frage: Verbessert die Prior-Anhebung eines durch `quickEval` ausgewählten vorhandenen
Wurzelkindes den Endstand? Ist diese Auswahl besser als eine zufällige Auswahl?
Die Eignung von `quickEval` ist eine Hypothese. Die Funktion wird bereits in der Engine
verwendet und liefert keine nachgewiesen unabhängige Bewertung.

## 2. Gemeinsame Auswahl und Eingriffsgelegenheit

Alle Arme bilden zunächst exakt die bisherigen Wurzelkinder mit ihren bisherigen Priors.
Nur ab `mc >= 80`, nur an der bisherigen Stelle der Wurzelbildung und vor den neuen
Simulationen wird die folgende Regel geprüft. Baumübernahme und `wurzelFrisch` bleiben
auf dem dokumentierten Ausgangsstand. Eine nicht neu gebildete Wurzel wird nicht verändert.

1. Für jedes vorhandene Wurzelkind wird `quickEval(board, idx, aiColor)` auf derselben
   unveränderten Stellung berechnet. Keine zusätzliche Kandidatenaufnahme.
2. Gewählt wird das Kind mit dem höchsten Wert; Gleichstände löst der kleinste Brettindex.
3. Gibt es weniger als zwei Kinder, einen nicht endlichen Auswahlwert oder einen
   ungültigen Prior, erfolgt kein Eingriff. Ungültige Priors sind zusätzlich ein
   Gültigkeitsfehler; nicht endliche Auswahlwerte werden ebenfalls als technischer Fehler
   behandelt und dürfen nicht still durch einen anderen Auswahlzug ersetzt werden.
4. Hat der gewählte Zug bereits einen maximalen Prior (einschließlich Gleichstand),
   erfolgt kein Eingriff. Sonst liegt eine Eingriffsgelegenheit vor.

Die Auswahl muss frei von Änderungen an Brett, Caches mit Einfluss auf spätere Bewertungen,
Baumstatistik und Suchzufallsstrom sein. Das ist vor einem Lauf eigens zu prüfen.
Ein Pass vor der Suche und das Ausbleiben einer Wurzelbildung erhalten eigene Protokollgründe.
Sie sind keine fehlenden Pflichtprotokolle.

## 3. Arme

| Arm | An einer Eingriffsgelegenheit |
|---|---|
| A | Keine Prior-Änderung; interne Auswahl nur protokollieren |
| H | Den durch `quickEval` ausgewählten Zug auf Spitzenprior anheben |
| R | Einen gleichverteilt zufällig gewählten Zug unter allen Kindern mit Prior strikt unter dem Maximum auf Spitzenprior anheben |

Anhebung: Für den gewählten Index j wird zunächst dessen Gewicht durch
`max(P[i], i != j)` ersetzt; anschließend werden alle Gewichte durch ihre neue Summe
geteilt. Verwendet wird die bestehende Anhebungsrechnung des Orakelversuchs.
Maximalprior-Gleichstände werden ohne Toleranz behandelt. Keine übrigen Priors oder
Suchparameter werden gezielt verändert. Die Kinder und ihre Reihenfolge bleiben erhalten.

R bestimmt seine Gelegenheit aus derselben internen Auswahlregel wie H, auf seiner eigenen
jeweiligen Stellung. Seine Auswahl verwendet einen eigenen reproduzierbaren Zufallsstrom,
abgeleitet aus Versuchsseed, Gegner, Partienummer und KI-Zugnummer; die Kandidaten dafür
werden nach Brettindex geordnet. Die Seed-Ableitung steht in §9.
H darf auch zufällig in R gewählt werden; diese Treffer werden nicht ausgeschlossen.

Bis zur ersten Gelegenheit müssen A, H und R identisch spielen. Danach sind identische
Stellungen oder Eingriffszahlen nicht zu erwarten. H − R vergleicht ganze Strategien:
Die ausgewählten Priors, Anhebungsstärken und späteren Stellungen können sich unterscheiden.
Der Vergleich isoliert daher nicht den Einfluss der Zugidentität bei gleicher Anhebungsstärke.

In keinem Arm wird ein Orakel zur Auswahl oder Auslösung aufgerufen. GNU Go als Gegner
oder Schiedsrichter bleibt Teil der Messbedingungen. Bereits vorhandene, an GNU-Go-Zügen
gelernte Netze und Muster bleiben bestehen; „ohne Orakel“ bedeutet hier ohne dessen
Abfrage während der Zugauswahl, nicht ohne diese Herkunft der Engine.

## 4. Bedingungen und Umfang

Vorschlag: 480 Partien je Arm und Gegner, insgesamt 2880 Partien plus Kontrollen.
Dies ist ein Umfangsvorschlag, keine zugesicherte Genauigkeit und kein freigegebenes Budget.
Die Streuungen von H − A und H − R sind unbekannt.

- GNU Go Stufe 1 und Fuego mit 100 Spielen je Zug als Gegner.
- GNU Go Stufe 1 als Schiedsrichter, Fläche, Komi 7,5, ohne Vorgabe, Aufgabe aus.
- `mctsFixedSims = 120`; Ausgangsstand: `1bf2ff3cc5258038697b91a79224c70e25761d87`
  (Import-Merge in `Hazeberry/codex`, Dateibaum identisch zu Quelle `14e2339bfa14f45cff164e113b217f26a8a6b8d4`).
  Die spätere Implementierungs-SHA wird vor jedem Lauf zusätzlich eingetragen.
- Nummern 1 bis 480 in allen Armen je Gegner; gleiche Seeds und Farbzuordnung über die Arme.
  Gerade Nummern: KI Schwarz. Ungerade Nummern: KI Weiß.
- Seed **236** für die technische Probe; **237** gegen GNU Go und **238** gegen Fuego
  für den vorgeschlagenen Hauptversuch reserviert. In den geprüften bisherigen Versuchsdokumenten
  und Orakel-Workflows wurde keine frühere Verwendung dieser Werte als Versuchsseed gefunden.
  Die bestehende Ableitung des Partie-Seeds (`Versuchsseed * 100000 + nr`) bleibt erhalten.
- Ein eigener Prozess je Partie; Engine-Vergleiche verschiedener Stände in getrennten Prozessen.

## 5. Endpunkte und Auswertung

Primärer Endpunkt: Endstand aus KI-Sicht einschließlich Komi; gepaarte Differenz nach
Gegner und Partienummer. Hauptvergleiche H − A und H − R gegen beide Gegner, vier Tests.
Zweiseitiger gepaarter t-Test, Bonferroni α = 0,05/4, Intervalle zu 98,75 %.
Dies ist die endpunktspezifische Festlegung analog zum bisherigen Vierarm-Versuch.

Für beide Hauptvergleiche je Gegner werden dieselben vollständigen Dreiergruppen verwendet.
Berichtet werden Anzahl, Mittelwert, SD der Paardifferenz, Intervall und p-Wert.
Keine Zwischenanalyse und keine Anpassung von Regel, Umfang oder Schwellen anhand der Wirkung.

Ergänzend und ohne weiteres Signifikanzurteil: R − A, Ergebnisse nach Farbe, Siegquoten
mit Clopper-Pearson-Intervallen sowie exakter McNemar-Test der gepaarten Siege/Nichtsiege.
Remis werden bei dieser binären Darstellung als Nichtsieg gezählt und zusätzlich separat
ausgewiesen. Deren p-Werte bleiben beschreibend; sie begründen keinen weiteren Hauptbefund.

H − A positiv: Die konkrete Regel hilft unter diesen Bedingungen. H − R positiv: Sie
ist besser als die festgelegte zufällige Strategie. Ein negatives Ergebnis wird ebenso
berichtet. Ein Intervall um null bedeutet keinen nachgewiesenen Unterschied; es belegt
weder Wirkungslosigkeit noch Gleichwertigkeit. Ein Ergebnis gilt für diese Regel und
diesen Suchumfang, nicht für alle internen Auswahlregeln.

## 6. Protokoll und Gültigkeit

Je KI-Zug: Stellungshash, Zugnummer, Farbe, Wurzelbildung/Baumübernahme, Kinder mit Index,
Auswahlwert und Prior vorher/nachher, interner Auswahlzug, tatsächlicher Anhebungszug,
Eingriffsgrund oder Grund für Ausbleiben, Prior-Summe, Besuche und gespielter Zug.
Je Partie zusätzlich: Quelle und Konfiguration, Seed, Endstand, Zugzahl, Dauer,
Abbruchgrund und Gegnerprozess-Status. Lange Fuego-Partien müssen anhand dieser Daten
von fehlenden Protokollen und technischen Abbrüchen unterscheidbar bleiben.

Zwei Zustände: gültig oder ungültig. Eine verletzte Pflicht ergibt **KEIN URTEIL**, Lauf rot,
keinen Effektbericht. Jede Prüfung nennt geprüfte und nicht prüfbare Einheiten separat.

1. Jede vorgesehene Nummer liegt je Arm/Gegner genau einmal mit Endstand oder ausdrücklich
   zulässigem Partieabbruch vor; Farben der angesetzten Partien sind ausgeglichen.
2. Mindestens 471 von 480 Partien je Arm/Gegner sind auswertbar; zusätzlich mindestens
   95 % vollständige Dreiergruppen je Gegner (456 von 480). Diese zusätzliche Schwelle
   verhindert stark unterschiedliche Ausfälle über die Arme. Kein Nachfüllen von Partien.
3. Eine regulär beendete Partie ohne Pflichtprotokoll oder Endstand ist ein technischer
   Fehler. Zulässige Ausfälle sind ausschließlich dokumentierte Gegnerabstürze oder
   vorab definierte Partiezeitüberschreitungen; Engine-Abstürze und kaputte Messdaten
   sind keine zulässigen Ausfälle. Zeitgrenzen stehen in §9.
4. Alle Kinderpriors sind endlich und nicht negativ, Summe innerhalb 10⁻⁹ von eins;
   Auswahlwerte endlich. Kinderbestand und Reihenfolge werden durch den Eingriff nicht geändert.
5. A hebt nie an; H und R erfüllen exakt §2/§3. Jede Gelegenheit und jeder ausgelassene
   Eingriff ist protokolliert. Je Gegner und Farbe muss es mindestens eine tatsächliche
   Anhebung in H und R geben; andernfalls ist der vorgesehene Mechanismus nicht geprüft.
6. Erste Eingriffsgelegenheit: gleiche Zugfolge, Stellung, interne Auswahl und Basispriors
   in allen drei Armen. Fehlende Gelegenheiten werden eigens berichtet; mindestens eine
   vollständige Gruppe je Gegner muss diese Prüfung ermöglichen.
7. Kontrolle A gegen Ausgangsstand und Schalter aus bitgleich, einschließlich gewählter
   Züge, Kinder, Priors und Suchzufallsstrom. Bestehende Seed-222-Kontrolle Nr. 1 bis 4
   bleibt verpflichtend. Keine Behauptung über nicht abgedeckte Fälle.
8. Wiederholung Nr. 1 bis 3 je Arm und Gegner identisch; nicht prüfbar gilt als nicht bestanden.
9. Gleiche Quellen und Konfiguration in allen Paketen; alle Zählersummen stimmen.

## 7. Technische Probe und erforderliche Tests

Probe: je Arm 8 Partien gegen GNU Go und 4 gegen Fuego, insgesamt 36 plus Kontrollen.
Geprüft werden Technik, Abdeckung der Farben, Reproduzierbarkeit und Dauer. Keine Ausgabe
von Endstand-Differenzen und keine Auswahl zwischen Varianten anhand der Probe.
Vollständigkeit bedeutet hier alle angesetzten Partien; nicht die 480er-Schwellen aus §6.
Wiederholungskontrolle und alle übrigen anwendbaren Prüfungen bleiben erforderlich.

Vor der Probe: Tests an gebauten Kinderlisten für Gleichstände, bereits maximalen
Auswahlzug, wenige Kinder, nicht endliche Werte, Normierung, R-Auswahl und getrennte
Zufallsströme; Kontrolle der Cache-Nebenwirkungen; Protokoll- und Berichtstests mit
gezielt verletzten Gültigkeitsbedingungen. Engine-Vergleich in Actions mit eigenem Go.
Schalter standardmäßig aus; keine Aktivierung in der Spieloberfläche.

## 8. Aufwand, offene Festlegungen und Ablauf

Die bisherigen 83,5 Stunden Partiezeit des Vierarm-Hauptlaufs liefern nur einen historischen
Anhaltspunkt. Orakelabfragen entfallen, Auswahlarbeit kommt hinzu und Partieverläufe ändern
sich. Ein belastbares Runnerbudget folgt aus der technischen Probe. Deren Maximum allein
ist keine sichere Schranke: Bisher dauerten einzelne Fuego-Partien über 1100 Sekunden.

Ausgangs-SHA, Seeds, Seed-Ableitung, Partiezeitgrenzen und Planungsbudget für die Probe
stehen in §4 und §9 zur Durchsicht. Vor dem Hauptlauf: endgültiger Umfang, Runnerbudget, Paketgrößen,
Schrittlimits, Fortsetzungsregeln und vollständige maschinenprüfbare Gültigkeitsbedingungen.
Diese Festlegungen dürfen nicht nach Sichtung der Hauptlauf-Wirkung geändert werden.

Reihenfolge: Hazeberry liest diesen Entwurf → Dokument-PR → grüne CI → ausdrückliches
Merge-Go → Merge mit Methode `merge` und voller Kopf-SHA → Abmeldung der PR-Aktivität
und kurzer Bericht mit löschbaren Branches. Anschließend eigenes Go für Umsetzung samt
Tests und manuellen Workflows, eigenes Go für technische Probe und eigenes Go für Hauptlauf.
Ergebnisse als Nachtrag, Rohdaten unter `docs/daten/prior-anhebung-ohne-orakel/`.
Eine Übernahme ins Spiel oder eine Prüfung bei browsernaher Suche ist eine eigene Entscheidung.


## 9. Konkretisierung der technischen Probe (zur Durchsicht)

**Seed und Umfang:** Seed 236, je Arm Nummern 1–8 gegen GNU Go und 1–4 gegen Fuego.
Dazu 18 Wiederholungspartien (Nummern 1–3 je Arm und Gegner) und die vier bestehenden
Seed-222-Kontrollen: insgesamt **58 Partien**. Ein erforderlicher Engine-Vergleich ist
zusätzliche Arbeit und braucht ein eigenes Go; er ist nicht still in dieser Probe enthalten.

**Zufall in R:** Pro KI-Zug FNV-1a über die ASCII-Zeichenfolge
`prior-ohne-orakel-v1|<Versuchsseed>|<g oder f>|<Partienummer>|<mc>`;
Offset 2166136261, pro Byte XOR und `Math.imul(h, 16777619) >>> 0`.
Mit dem Ergebnis wird eine neue Instanz der vorhandenen `mulberry32`-Implementierung
initialisiert. Für m zulässige Kandidaten wird `u = floor(random() * 4294967296)`
gezogen. Werte `u >= floor(4294967296 / m) * m` werden verworfen; sonst ist `u % m`
der Index in der nach Brettindex sortierten Liste. Das vermeidet Modulo-Verzerrung.
Der Suchzufallsstrom wird weder ersetzt noch konsumiert. Bei m = 0 gibt es keinen Eingriff.
Algorithmus und Testvektoren werden vor dem ersten Lauf durch kurze Funktionstests geprüft.

**Zeitgrenzen:** Externe Grenze für die komplette einzelne Partie inklusive Initialisierung,
Gegnerabfragen und Endwertung: 600 s gegen GNU Go, 1800 s gegen Fuego. Der Wächter
beendet bei Überschreitung den gesamten Partieprozess samt Kindprozessen und sichert
vorhandene Protokolle. Keine Kürzung des Simulationsbudgets oder Änderung von GTP-Limits
als Reaktion auf die Laufzeit. Für die technische Probe führt jede Partiezeitüberschreitung
zu KEIN URTEIL; sie darf nicht als erfolgreiche technische Prüfung gezählt werden.
Ein dokumentierter Gegnerabsturz wird separat gemeldet; jede nicht prüfbare
Wiederholung bleibt eine verletzte Pflicht. Die 98-%-/95-%-Schwellen gelten erst im Hauptlauf.

**Planungsbudget:** 8 Runnerstunden für einen Durchgang einschließlich Tests, Fuego-Bau,
Kontrollen, Wiederholungen und Bericht; keine garantierte Laufzeitobergrenze. Grundlage
ist die historische Probe, keine neu durchgeführte Messung. Vor Start muss der Workflow
seine Jobzahl und Zeitlimits so ausweisen, dass die maximale Summe der konfigurierten
Joblaufzeiten höchstens 8 h beträgt. Überschreitet der nötige Aufbau dieses Budget,
wird vor einem Start die Vorgabe zur Durchsicht angepasst. Parallele Jobs verkürzen die
Wanduhrzeit, nicht die Summe der Runnerstunden.

**Sicherung und Wiederaufnahme:** Je abgeschlossener Partie Rohdaten und Metadaten sichern;
Jobs mit `fail-fast: false`. Pro Durchgang dieselbe Quellen-SHA und Konfiguration in allen
Jobs. Kein automatischer Neustart eines ungültigen Laufs. Eine Wiederaufnahme braucht
ein eigenes Go und darf nur vollständige, auf Quelle, Konfiguration, Arm, Gegner, Seed
und Nummer geprüfte Datensätze übernehmen. Fehlende Datensätze werden ausdrücklich gelistet.

**Offen bleibt:** Budget und endgültiger Umfang des Hauptversuchs sowie seine Paketgrößen.
Eine technische Probe oder ein Engine-Vergleich wird erst nach ausdrücklichem Start-Go
für den konkret vorgelegten Workflow ausgeführt.

## 10. Umsetzung und Konkretisierung vor dem ersten Lauf (06.11.2026)

### Auswahlwert und unveränderte Suche

`quickEval` addiert am Ende `Math.random()*5`. Die übrigen Summanden sind Vielfache
von fünf; dieser Anteil löst bisher Gleichstände zufällig. Für die festgelegte
Indexentscheidung wird **ausschließlich bei der zusätzlichen Auswahlbewertung der
Rauschanteil auf null gesetzt**. Die Funktion selbst und ihre bisherigen Aufrufe
bleiben unverändert. Das konkretisiert die Auswahlregel aus §2 vor der Messung.
Ohne diese Konkretisierung wären Suchzufallsstrom und feste Indexentscheidung
nicht zugleich durch den bisherigen Aufruf erfüllt.

Die Auswahlbewertung sichert und restauriert `Math.random`, `_ffEpoch`, `_ffVisited`,
`_rdgChecked`, `_groupQueue` und `_quickScratch` in `finally`, auch am Epochenüberlauf
und bei Fehlern. Der Brettzustand wird nicht beschrieben. Kurze Funktionstests prüfen
dies; ein Vergleich an Archivstellungen bleibt eine gesonderte Pflicht in Actions.

Der Messpfad ist ausschließlich `extra.priorOhneOrakel = {arm, seed, gegner, nr}`.
Ohne diesen Kontext ist er aus; es gibt keinen UI- oder PARAMS-Schalter. Die
Zugnummer stammt aus dem wirklichen Engine-Aufruf. `lesePriorOhneOrakel()` liefert
das letzte Protokoll. Die Besuche N und Wertsumme W werden nach der Suche erfasst.
`neu` kennzeichnet einen Wurzelaufbau, `wieder` eine zunächst übernommene Wurzel;
beide dürfen wahr sein, wenn die bestehende Frischwurzelregel danach neu aufbaut.
Nur `neu` erlaubt die zusätzliche Auswahlbewertung und einen möglichen Eingriff.

Protokollgründe: `keine-suche`, `pass-vor-suche`, `wurzel-uebernommen`, `vor-zug81`,
`weniger-als-zwei`, `auswahl-schon-maximal`, `gelegenheit`, `fehler`.
Bei übernommener Wurzel und vor dem Fenster bleiben Auswahlwerte null.
Ungültige Zahlen werden nicht repariert; der unabhängige Bericht sperrt das Urteil.

### Werkzeuge und konkrete Workflows

- `gnugo-duell.js --prior-ohne-orakel A|H|R --partien 1 --von NR --seed SEED --roh DATEI`
  protokolliert jeden KI-Zug und GTP-Prozess. Optional `--prior-protokoll DATEI`, sonst
  `DATEI.prior.jsonl`. Die Seitenprotokolldatei muss neu sein. Orakeloptionen sind
  zusammen mit diesem Messmodus verboten.
- `auswertung/prior-ohne-orakel/regel.js` prüft die Zahlen unabhängig vom Enginecode,
  einschließlich R-Seed, Ziehung und normalisierten Priors.
- `prior-ohne-orakel-vergleich.yml`: nur manuell, Eingabe volle Implementierungs-SHA.
  Zwei Archivpartien (Seed 222, Nummern 1/2) bis Zug 130, jeweils Ausgangsstand,
  neuer Stand ausgeschaltet und neuer Stand A: sechs getrennte Prozesse/Jobs.
  Vergleich von Zügen, Kindern, Priors, N/W und kumulierten Suchzufallsziehungen;
  endliche Priors und Auswahlbewertung ab Zug 81 in beiden Farben sind Pflicht.
  Fehlt die Abdeckung, ist das Ergebnis KEIN URTEIL. Keine Aussage über weitere Fälle.
  Höchstsumme der Joblimits: 6 × 20 + 10 = 130 Minuten, zusätzlich zur Probe.
- `prior-ohne-orakel-probe.yml`: nur manuell, Eingabe Run-ID des grünen Vergleichs.
  Die Vorprüfung prüft dessen Status, Workflow, Ausgangsstand, Engine-Dateihash und
  die Hashes von Vergleich und Replay gegen den aktuellen Checkout. Erst danach
  können Partiejobs starten. Kein Vergleich wird automatisch ausgelöst.
- `paket.py`: ein Prozess je Partie, externe Zeitgrenzen aus §9, Sicherung nach jeder
  Partie und Prozessgruppenabbruch bei Zeitüberschreitung. Metadaten enthalten volle
  Commit-SHA, SHA-256 der aufgeführten Quellen, Programmversionen/Binaryhashes und
  Konfiguration. Ein technischer Fehler bleibt im Paket erhalten und macht es rot.
- `bericht.js`: Pflichtprüfung aller 58 Datensätze, Wiederholungen, Kontrollen,
  Prozessprotokolle und erster gemeinsamer Gelegenheit. Die Probe enthält ausschließlich
  Technik, Abdeckung, Ausfälle und Zeiten; keine Endstand-Differenzen oder Siegquoten.
  Bei verletzter Pflicht: KEIN URTEIL und Exitcode 1. Rohwerte bleiben zur Prüfung erhalten.

Probe-Joblimits: Vorprüfung 20, Fuego-Bau 30, drei GNU-Go-Jobs je 45, drei Fuego-Jobs
je 85, Kontrolle 20 und Bericht 15 Minuten; Summe **475 Minuten**. Zusätzliche
Schrittlimits lassen innerhalb der Jobs Zeit für Uploads. Ein vorzeitig beendeter Job
mit fehlenden Datensätzen erzeugt KEIN URTEIL. `fail-fast: false`, kein automatischer
Neustart. Eine Wiederaufnahme ist im manuellen Probe-Workflow nicht angeboten;
der Pakethelfer erlaubt sie nur unter den strengen Bedingungen aus §9 und nach Go.

Der Hauptbericht ist anhand gebauter Testdaten vorbereitet. Bei den ergänzenden
Siegquoten werden nur ausdrücklich entscheidbare Siege/Nichtsiege gewertet; am
Zuglimit ohne Siegentscheidung wird keine Entscheidung aus dem Stellungs-Endstand
erfunden. Nicht entscheidbare Fälle werden gezählt. Remis sind Nichtsiege und werden
separat gezählt. Der primäre Endstand-Vergleich bleibt davon unberührt.
Es gibt noch keinen Hauptlauf-Workflow: Umfang und Budget sind weiterhin offen.

### Nächste Schritte

Diese Konkretisierung vor dem Merge lesen; anschließend grüne CI und Merge.
Danach eigenes Start-Go für den oben beschriebenen Engine-Vergleich und anschließend
für die technische Probe. Erst deren gültiger Technikbericht erlaubt die endgültige
Planung des Hauptversuchs. Die Eignung von H bleibt bis zu dessen Auswertung offen.

## 11. Ergebnisnachtrag: Engine-Vergleich (06.11.2026)

Go in der Sitzung vom 06.11.2026 für die Konkretisierung in §10, Merge von PR #7,
Engine-Vergleich und anschließende technische Probe. PR #7 wurde mit voller Kopf-SHA
`268336ce42caaa4e03b5c18bfc826f4cae3df73d` und Methode `merge` gemergt;
Implementierungs-/Merge-Stand `6bfaa33d69822f13a049b5813d4b6c77b63b61a3`.
Vorher waren 50 Node-Testsuiten und alle fünf Browser-Suiten grün
([CI 42162679006](https://github.com/Hazeberry/codex/actions/runs/42162679006)).

**Engine-Vergleich gültig: GLEICH.**
[Actions-Lauf 42164242839](https://github.com/Hazeberry/codex/actions/runs/42164242839),
Ausgangsstand `1bf2ff3cc5258038697b91a79224c70e25761d87`, neuer Stand wie oben.
Die sechs getrennten Replays (Seed 222, Nummern 1/2, bis Zug 130; alt, neu aus,
neu A) stimmen in allen **130 KI-Abfragen** bei Zug, Kindern, Priors, N/W und
kumuliertem Suchzufallsverbrauch überein. Keine Archivabweichung.
Die zusätzliche Auswahlbewertung ab Zug 81 ist an **25 Stellen für Schwarz und
25 für Weiß** abgedeckt. Alle Vorprüfungen bestanden; keine Aussage über weitere
Partien, spätere Züge oder Zeitbudgets.

Quellen und unverändertes ZIP mit den sechs Dumps:
[`docs/daten/prior-anhebung-ohne-orakel/engine-vergleich-42164242839/`](daten/prior-anhebung-ohne-orakel/engine-vergleich-42164242839/).
Artefakt `prior-engine-pruefung`, ID `13477644638`, ZIP-SHA-256
`90b58898d5023556a01349ce47c9ca1604fcdec6ce6afbe68571ddc9a4884b47`.
Die technische Probe verwendet diesen Vergleich als Pflichtnachweis.

## 12. Ergebnisnachtrag: technische Probe (06.11.2026)

**Gültig.** [Actions-Lauf 42164396423](https://github.com/Hazeberry/codex/actions/runs/42164396423),
Versuchsseed 236, Implementierungsstand `6bfaa33d69822f13a049b5813d4b6c77b63b61a3`.
Der Start war durch dasselbe ausdrückliche Go nach Durchsicht von §10 gedeckt;
der Pflichtvergleich aus §11 war vorher bestanden.

- **58/58 Partien** mit Status `ok`: 36 reguläre Probenpartien, 18 Wiederholungen und
  vier Archivkontrollen mit Seed 222. Keine Abbrüche oder Zeitüberschreitungen.
- **70/70 technische Pflichtprüfungen bestanden**. Alle 18 Wiederholungen stimmen
  bei Zugfolge, Endstand und zeitunabhängigem Eingriffsprotokoll überein. Alle vier
  Archivkontrollen sind bei Zugfolge und Endstand gleich.
- Acht vollständige Dreiergruppen gegen GNU Go und vier gegen Fuego. In allen zwölf
  Gruppen stimmt die erste Eingriffsgelegenheit einschließlich vorheriger Zugfolge,
  Stellungshash, Auswahlwerten und Basispriors überein.
- A hebt nie an. H und R heben gegen beide Gegner in beiden Farben tatsächlich an.
  Priors, Normierung, Ausnahmen, Zufallsableitung, Quellen und Prozessprotokolle
  erfüllen die festgelegten Prüfungen. Es gab keine Orakelabfrage zur Zugauswahl;
  GNU Go blieb Gegner beziehungsweise Schiedsrichter. Alle Pakete verwendeten Node
  v22.23.4 sowie dieselben GNU-Go- und Fuego-Binaries je Rolle.

### Zeiten und tatsächliche Anhebungen

Die Tabelle umfasst nur die **36 regulären Probenpartien**. Angegeben ist die gesamte
Partieprozessdauer einschließlich Initialisierung, Gegner und Endwertung. S/W bezeichnet
die KI-Farbe; die Eingriffszahlen sind Züge, keine Partien.

| Gegner | Arm | Partien | Median s | Maximum s | Anhebungen S | Anhebungen W |
|---|---|---:|---:|---:|---:|---:|
| GNU Go | A | 8 | 24,5 | 27,3 | 0 | 0 |
| GNU Go | H | 8 | 29,5 | 33,5 | 364 | 406 |
| GNU Go | R | 8 | 31,4 | 34,3 | 371 | 416 |
| Fuego | A | 4 | 41,1 | 44,3 | 0 | 0 |
| Fuego | H | 4 | 28,4 | 34,3 | 221 | 215 |
| Fuego | R | 4 | 38,9 | 43,8 | 260 | 236 |

Über **alle 58** Partien: 1791,4 s summierte Partiezeit (29 min 51 s), Maximum 44,3 s.
Summierte Joblaufzeiten einschließlich Vorprüfung, Bau und Bericht: **35 min 14 s**
ohne Abrechnungsrundung. Wanduhr vom Run-Start bis Abschluss: **7 min 41 s**.
Die konfigurierte Höchstsumme betrug 475 Minuten. Zeitstempel sind in `run.json` und
`jobs.json` gesichert. Diese kleine Probe liefert keine sichere Laufzeitschranke für
den Hauptlauf und keinen Nachweis, dass frühere Absturz- oder Laufzeitursachen behoben sind.

### Daten und Grenze der Aussage

Unverändertes Gesamtartefakt mit Rohzeilen, Einzelpartie- und GTP-Protokollen sowie
Quellenmetadaten, daneben der lesbare Bericht und Prüfbericht:
[`docs/daten/prior-anhebung-ohne-orakel/probe-42164396423/`](daten/prior-anhebung-ohne-orakel/probe-42164396423/).
Artefakt `prior-probe-gesamt-1`, ID `13478352571`, ZIP-SHA-256
`6b9e1bb92b980c9ac25168c2399d58d8c1b2236652e0b81c1c65efe255e25e07`.
Die heruntergeladenen ZIP-Prüfsummen stimmen mit den von GitHub gemeldeten Digests überein.

Der Bericht enthält **keine Endstand-Differenzen, Siegquoten oder Wirkungsauswertung**;
`auswertung` ist null. Der Aufbau und die konkrete Auswahlregel funktionieren unter
den geprüften Bedingungen technisch. Ob H den Endstand verbessert und besser als R
ist, bleibt offen. Auch die Herkunft aus GNU-Go-geprägten Daten und die GNU-Go-Wertung
sind durch diese Probe nicht getrennt untersucht. Vor einem Hauptlauf stehen weiterhin
die endgültige Festlegung von Umfang, Budget und Paketen sowie dessen eigenes Start-Go.

Die Abmeldung der PR-Aktivität nach Merge von PR #7 wurde versucht; GitHub verweigerte
`updateSubscription` mit `FORBIDDEN: Resource not accessible by integration`.
