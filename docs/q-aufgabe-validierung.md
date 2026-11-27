# Unabhängige Prüfung der Q-Aufgaberegel

Entwurf zur Durchsicht. Das Go vom 27. November 2026 gilt für den Aufbau und den synthetischen Actions-Lauf. Hazeberry hat anschließend die autonome Durchführung der Messung in GitHub Actions beauftragt.

## Fragestellung und Quellenstand

Wie oft gibt die KI unter festgelegten Spielbedingungen per Q auf, obwohl die externe Fortsetzungsprüfung für ihre Farbe günstig endet? Zielpopulation sind neue 19×19-Partien der schweren KI gegen GNU Go 3.8 Stufe 1. Aussagen über menschliche Gegner oder Handy-Zeitbudgets brauchen eigene Daten.

Referenz ist codex bei `04a9287b3098055ea76be37e3685e009c1f7d45c`, SHA-256 von index.html `a14ac4d4058072ec552ca524832095f628412224b96ff7159806e35499fcb4b6`. Im MCTS-PUCT-Zweig wird das erste Wurzelkind mit maximaler Besuchszahl gewählt. Sein ungerundetes Q ist W/N aus KI-Sicht, bei N=0 ist Q=0. Bei vorhandenem Suchergebnis zählen resignEnabled ≥ 1, mc ≥ 60 (bisher gespielte Halbzüge), Q ≤ −0,95 und gebietSagtVerloren. Mit resignAreaMargin = −1 lässt die Gebietsprüfung jeden solchen Zug durch. Bei aktiver Marge m wäre eigene Rohfläche < fremde Rohfläche − m nötig. Fünf erfüllte Prüfungen lösen Aufgabe aus. Eine im Q-Zweig geprüfte Gegenbedingung setzt den Zähler auf null. Ein früher Rücksprung außerhalb dieses Zweigs kann den Zähler stehen lassen. Das separate Benson-Kriterium für ausschließlich todgeborene Züge hat einen eigenen Zähler (Default drei) und Rückstandsprüfung. Es erhält eine eigene Endkategorie.

## Archivprüfung ohne Ergebniszugriff

Geprüft wurden Verzeichnisnamen, Versuchsdesigns, Workflow-Konfiguration und Übergabedokument. Die Ausgänge der möglichen Prüfpartien wurden dafür nicht geöffnet.

| Herkunft | Eignung für einen unberührten Prüfsatz |
|---|---|
| aufgabe-113, death-transfer, gefangene-rollout, deckel-fortsetzungen | Bekannte oder gezielt ausgewählte Archivstellungen und deren Varianten. Zur Regelentwicklung verwendet. |
| Historische Deckel- und Gebietsversuche | Bereits zur Untersuchung falscher Aufgaben ausgewertet. |
| prior-anhebung-ohne-orakel einschließlich Actions- und Container-Hauptlauf | Aufgabe deaktiviert und gleiche Hauptseeds 237/238, technische Kontrolle 222, Probe 236. |
| Übrige Archivfamilien, etwa PWA-Vergleiche | Aus dem gesichteten Bestand ist kein reserviertes Kollektiv mit identischem Quellstand, vollständigem ungerundetem Q-Verlauf, Aufgabenursache und reproduzierbarer Stellung belegt. |

Daraus folgt die Planung einer neuen Stichprobe. Die Sichtung liefert keinen Vollständigkeitsnachweis über private Archive.

## Stichprobe und Aufzeichnung

Vorschlag vor Ergebnisseinsicht: 400 feste Nummern 1–400, Seedbasis 6419, effektiver Seed 641900000 + Nummer. Gerade Nummern KI Schwarz, ungerade Weiß. Pro Partie ein frischer Prozess, 120 feste Simulationen, adaptive Suche aus, Komi 7,5, chinesische Fläche, leeres Brett, Gegneraufgabe aus, 600 Halbzüge als Limit. Alle übrigen Engineparameter wie im Referenzstand, Q- und Benson-Aufgabe an. Vor Freigabe Schlüssel und effektive Seeds mit allen verfügbaren alten Manifesten einschließlich H/R und Wiederholungen abgleichen. Verwendete Schlüssel oder doppelte Nummern sperren den Start. Auch identische vollständige Verläufe und identische Aufgabestellungen per Hash samt Farbe, Historie und Ko protokollieren. Duplikate innerhalb der Stichprobe samt Häufigkeit berichten und die Raten zusätzlich je eindeutiger Stellung beschreiben. Bekannte Diagnosepfade oder exakte Altpartien im Prüfsatz als Kontamination melden und das Haupturteil sperren. Keine Ersatzpartien.

Je KI-Aufruf Quelle, Seed, Farbe, mc, gewählten Pfad, ungerundetes W, N, Q, Serienstand vorher/nachher und tatsächliche Entscheidung protokollieren. Für jede Aufgabe den vollständigen GTP-Verlauf bis unmittelbar vor dem Aufgeben sichern. Je Partie zählt höchstens die erste tatsächliche Q-Aufgabe. Die geplante Messinstrumentierung muss auf synthetischen Eingaben dieselben Züge, Rückgaben und Zufallszustände wie die Referenz liefern. Rohdaten vor der Begutachtung anhand eines Manifests einfrieren.

## Externe Beurteilung und Grenzen

Jede Q-Aufgabestellung zweimal in einem frischen GNU-Go-Prozess aus der vollständigen Historie rekonstruieren. Gleiche Regeln, Komi und Zugrecht prüfen. GNU Go spielt beide Farben ohne Aufgabe, einmal Stufe 1 und einmal Stufe 10, jeweils mit dem Partie-Seed. Ab dem ursprünglichen Zugrecht bis zwei Pässe oder höchstens 600 weitere Halbzüge fortsetzen. Nach zwei Pässen final_score mit derselben Flächenregel auswerten und auf die aufgebende Farbe beziehen. Zwei positive Margen heißen voreilig, zwei negative berechtigt. Unterschiedliche Vorzeichen, Remis oder Erreichen der Zuggrenze heißen unklar. GTP-Fehler, falsches Zugrecht, fehlende Daten oder ein Prozessabbruch sind technische Fehler. Diese Beurteilung misst Rettbarkeit unter den beiden festgelegten GNU-Go-Fortsetzungen. Beide verwenden dieselbe Engine. Daraus ergibt sich kein Beweis für optimales Spiel.

## Auswertung und Sperren

Primär Zahl voreiliger Q-Aufgaben je 400 angesetzte Partien. Zusätzlich berechtigte und unklare je 400, alle drei Anteile je ausgelöster Q-Aufgabe und getrennt nach KI-Farbe ausweisen. Nenner 0 als „nicht schätzbar“ ausgeben. Unklare Fälle bleiben im Nenner. Für jede Rate exaktes zweiseitiges Clopper-Pearson-Intervall zu 95 % berichten, für den Gesamtwert unter der Annahme unabhängiger vergleichbarer Partien als Modellintervall kennzeichnen. Farbwerte getrennt ausweisen. Unklarheit zusätzlich als Spannweite von voreilig/400 bis (voreilig + unklar)/400 darstellen. Einzelzüge und die zwei Bewertungen einer Stellung erhöhen die Stichprobengröße nicht. Bei wenigen Aufgaben bleibt das bedingte Intervall breit.

Alle 400 Nummern müssen mit eindeutiger Endkategorie vorliegen (Q, Benson, reguläres Ende oder Zuglimit). Für jeden Q-Fall müssen beide externen Verfahren einen auswertbaren Abschluss oder das festgelegte Zuglimit belegen. Quellen-/Seedabweichung, defekter Verlauf, widersprüchliche Aufgabenursache oder unvollständige Pflichtdaten ergeben „kein Urteil“ mit Fehlerliste. Keine Zwischenanalyse, Nachfüllung, Änderung der Schwelle oder Ableitung einer Defaultänderung.

## Technische Vorbereitung

Der Workflow q-aufgabe-aufbau.yml prüft das vorhandene Gebietskriterium und künstliche Eingaben für Schwelle, Mindestzug, Serie, Pfad ohne Q-Prüfung, Farbe, Grenzfälle und Intervall. Je synthetischem Fall lädt er die Worker- und Regelskripte aus index.html in einen frischen Kontext. getAIMove erhält definierte Suchresultate und entscheidet selbst über Stein, Pass und Q-Aufgabe. Der Test prüft auch ausgeschaltete Aufgabe und die aktivierte Gebietssperre. Clopper-Pearson wird bei 0, 50 und 100 Erfolgen von 100 gegen Referenzgrenzen sowie bei Nenner null geprüft. Er enthält keinen Partiestarter. Der manuelle Einstieg für die Messung ist tests.yml mit q_messung=true. Der aufgerufene Workflow q-aufgabe-messung.yml prüft zwei synthetische Workerstellungen gegen die unveränderte Suchausführung, Zug und Zufallszustand sowie GTP-Rekonstruktion für beide Zugrechte. Die Vorprüfung erfasst die verfügbaren Archivmanifeste und Zuglisten in docs/daten sowie die 134 verfügbaren Originalpakete des unvollständigen H/R-Laufs. Die bekannten Diagnosepunkte werden auch als Präfixe erfasst. Der parallele H/R-Container verwendet dieselben reservierten Seeds wie die ursprüngliche H/R-Messung.

40 Pakete zu zehn Partien laufen mit maximal zehn parallelen Jobs. Je Partie gelten 600 Sekunden, je Paket einschließlich Installation und Upload 110 Minuten. Die Bewertungen beginnen erst nach Sicherung aller Rohpakete. Pro GTP-Antwort gelten 120 Sekunden und je Bewertungspaket 110 Minuten. Bei technischem Abbruch bleiben die verfügbaren Rohpakete als Actions-Artefakte erhalten. Keine Ersatzpartien. Bei mehreren Urteilen zur identischen Stellung mit identischer Historie und Farbe wird eine widersprüchliche Einstufung für die Zusatzrate je eindeutiger Stellung als unklar gezählt.
