# Gezielte Browserprüfung der Bughunt-Befunde

Stand: Testaufbau vorbereitet, 07.11.2026. Noch keine vollständige Browserausführung.
Diese Diagnose prüft Bedien- und Trainingsfehler, keine Spielstärke und keine Q-Kalibrierung.
Keine Änderung an index.html oder gtp-ki.js.

## Braucht es Chromium?

GTP-1/GTP-3 sind bereits mit echten Node-Adapterprozessen reproduziert; GTP-2 ist als
fehlende Kontextübergabe belegt. Dafür ist kein Browser erforderlich.
Für Workerzustellung, echten Canvas-Cache, DOM-Anzeige und Browser-Storage ist eine
Browserprüfung sinnvoll. Chromium mit Playwright ist eine praktische gemeinsame
Umgebung, kein besonderer Go-Schiedsrichter. Die Prüfung belegt zunächst Chromium;
Firefox oder ein bestimmtes Handy sind damit nicht geprüft.

## Start in Codex

Im Klon von Hazeberry/codex auf dem Branch dieses Testaufbaus bzw. nach dessen Merge.
Node und die Dateien aus dem Repository werden benötigt. Für die Installation sind
die Paket-/Browserdomains in der Codex-Umgebung freizugeben, falls sie gesperrt sind.

```bash
npm install --no-save --no-package-lock playwright@1.56.1
npx playwright install --with-deps chromium
node auswertung/bughunt-20261107/browser.cjs --aus /tmp/codex-bughunt-browser
```

Version und Installation entsprechen dem bestehenden Browser-CI-Aufbau des Projekts.
Ist Chromium bereits vorhanden, entfallen Installationen. Bei einem abweichenden
Browserpfad: `CHROMIUM_PATH=/absoluter/pfad/chrome node auswertung/bughunt-20261107/browser.cjs --aus /tmp/codex-bughunt-browser`.
Ein fehlender Browser liefert Exit 2 und einen Bericht mit ungeprüften Fällen.
Ein lokaler Start bleibt ein kurzer Funktionstest; kein GNU Go und keine Partien.

Nur die Start-/Berichtslogik ohne Browser prüfen:
`node auswertung/bughunt-20261107/browser.cjs --selftest`.

## Ausgabe und Exit-Codes

Im Ausgabeordner stehen `bericht.json`, `bericht.md` und Screenshots.
UI-3 enthält außerdem Canvas-PNGs unmittelbar nach dem Pass und nach dem kontrollierten
Neuzeichnen derselben Stellung. Quelle (SHA-256 von index.html), Node-Version,
Browser-Version und Zeit werden festgehalten. Ein neuer Browserkontext je Fall
verhindert die Nutzung persönlicher gespeicherter Gewichte. Externe Seitenaufrufe
werden blockiert; die Spielseite kommt von einem kurzlebigen lokalen HTTP-Server.

- Exit **0**: alle sieben Fälle prüfbar, kein Defekt in diesen Abläufen reproduziert.
- Exit **1**: mindestens ein Defekt reproduziert, alle Fälle prüfbar.
- Exit **2**: unvollständige Prüfung, fehlende Voraussetzung oder Testfehler.
  Das kann zusätzlich zu reproduzierten Defekten auftreten; Bericht lesen.
- Status je Fall: `reproduziert`, `nicht_reproduziert`, `nicht_pruefbar`, `testfehler`.
  Ein nicht reproduzierter Fall beweist keine allgemeine Fehlerfreiheit.
- Am unveränderten Quellenstand sind reproduzierte Defekte zu erwarten.
  Ein roter Diagnose-Lauf ist daher ein möglicher Befund, kein automatischer
  Auftrag, das Spiel oder die Tests so zu ändern, dass alles grün wird.

Das Skript wird bewusst nicht in `tests/run.js` aufgenommen: Es untersucht offene
Defekte und soll die bestehende normale CI nicht durch erwartete Defekte blockieren.
Nach einer gezielten Korrektur sind daraus passende Regressionstests abzuleiten.

## Fälle und Instrumentierung

| Fall | Aufbau | Beobachtung / Fehlerkriterium |
|---|---|---|
| UI-1 | App startet Anfrage über ihre originale Worker-Anbindung. Ein echter Browser-Worker mit kontrolliertem Antwortskript hält die Antwort bis zur Freigabe zurück. KI wird per Button abgeschaltet, dann Antwort freigegeben. Keine MCTS-Suche. | Zug nach Abschalten oder nicht gelöschter Thinking-Zustand. Workerabsturz/Fallback macht die Prüfung unklar. Eine durch Terminierung verhinderte Zustellung ist zulässig. |
| TRAIN-1.pass | Echter forward/backward/trainGame mit einem Trainingsbeispiel. Zwei Pass-Buttons beenden die kurze synthetische Partie, Undo-Button öffnet sie wieder. Gewichte, Zähler und gespeicherter Netzstand werden verglichen. | Training hat gezählt, Undo öffnet die Partie, behält aber trainierten Stand, Zähler, Speicher und _trained. Keine Festlegung einer Reparaturstrategie. |
| TRAIN-1.resign | Wie zuvor; Ende über eingespeistes resign-Ergebnis in originalem applyAIResult. | Gleicher Prüfpunkt nach Aufgabe. Kontrolliertes Ergebnis statt echter Suchaufgabe. |
| UI-2 | Synthetische lebende Schwarzgruppe mit zwei Augen, zwei Pässe. Territory-Button nach Spielende. | Anzeige passt nicht zum direkt gezählten Territory-Ergebnis; SGF-Ergebnis zusätzlich im Bericht. Fixture muss unterschiedliche Area-/Territory-Differenz haben. |
| UI-3 | Vorhandene Fixture tests/stellungen/zaehlung-358.sgf, Vorschau-Button, Pass-Button. Danach Vergleich mit einem kontrollierten Cache-Neuaufbau derselben Stellung. | Vorschauzustand und Panel sind aus, aber Canvas-Pixel unterscheiden sich vom neu gezeichneten Bild. Ohne sichtbare Vorschau-Markierungen ist der Fall nicht prüfbar. |
| TRAIN-2 | Weiß-Beispiel über originalen Pufferpfad, Farbwechsel per Button, Schwarz-Beispiel. Kontrollierter synthetischer Schwarz-Endzustand. Wrapper um echten _backward protokolliert Farbe und advantage, führt originales Training aus. | Weiß-Beispiel bekommt bei Schwarzsieg positives Signal. Verwerfen des Puffers beim Farbwechsel ist eine mögliche korrekte Alternative. |
| NET-1 | Nach normalem Seitenstart wird Storage.prototype.removeItem gezielt so überschrieben, dass SecurityError entsteht; anschließend originales PolicyNet.reset. Override wird wieder entfernt. | Reset wirft oder lässt Gewichte/Zähler/_trained/_healthy unzurückgesetzt. Das simuliert verweigerten Zugriff, keinen realen Browser-Permissionsdialog. |

Synthetische Endstellungen und kontrollierte Workerantworten sind Prüfdaten für
Bedien-/Trainingsinvarianten. Sie begründen keine Spielstärkeaussage. Keine
Anwendung auf persönliche Gewichte. Keine allgemeine Fehlerfreiheit bei Exit 0.

## Alternative: GitHub Actions

`.github/workflows/bughunt-browser.yml` ist ausschließlich manuell startbar, ohne
Eingaben. Es installiert dieselbe Playwright-Version und Chromium und führt diese
sieben Fälle aus. Artefakte und Kurzbericht werden auch bei Exit 1/2 gesichert.
Ein eigener Lauf wurde nicht gestartet. Ein Actions-Start braucht weiterhin
Hazeberrys ausdrückliches Go. Der bestehende Tests-Workflow bleibt unverändert.

## Hier tatsächlich geprüft

- `node --check`: Syntax gültig.
- `--selftest`: neun Prüfungen der Status-/Exit-Logik bestanden.
- Start mit vorhandenem Playwright und fehlendem Chromium: Exit 2, alle sieben
  Fälle ausdrücklich nicht prüfbar, JSON und Markdown geschrieben.
- **Nicht geprüft:** echte Browserausführung und manuelles Actions-Workflow.
  In dieser Sitzung fehlt das Chromium-Executable. Daher sind die Browserfälle
  vorbereitet, nicht als erfolgreich ausgeführt dokumentiert.
