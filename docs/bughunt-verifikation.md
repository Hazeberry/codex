# Bughunts: Verifikation am Stand 17117ae

Datum: 07.11.2026. Repository: Hazeberry/codex. Quellencommit:
`17117ae822dfa0d836964311cf2f6aa41d489f2e`.
Auftrag: neun übermittelte Befunde prüfen, ohne Spiel-/Adapterkorrekturen oder Messläufe.

## Methode und Grenzen

Statische Durchsicht und kurze lokale Funktionstests unter Node v24.22.1.
Kein GNU Go, keine Suchpartien, keine Engine-Vergleiche, keine Actions-Messung.
Die unmodifizierten Quellen wurden über GitHub gelesen. Das Reproduktionsskript schneidet
Originalfunktionen aus index.html aus; DOM, Canvas, Workerantwort bzw. ausgewählte
Trainingsoperationen sind kontrollierte Attrappen. Es ist kein vollständiger Browsertest.
Bei GTP-1/GTP-3 läuft der unveränderte Adapter als echter Node-Unterprozess.
GTP-2 instrumentiert ausschließlich die aufgerufene getAIMove-Funktion in einer temporären
HTML-Datei, um Argumente zu beobachten; keine Suchentscheidung wird daraus behauptet.

Playwright ist installiert, der Start scheiterte an der fehlenden Datei
`/root/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell`.
Auch die lokale Suche fand keinen verfügbaren Chromium/Chrome-Browser.
Browserinteraktion, echte Workerzustellung und Pixelvergleich bleiben offen.

Quellen-SHA-256:
- index.html: `7bf3158212700948deaef4616b9c95f83521b5fe2ac840ad601996de60b8bf0a`
- gtp-ki.js: `51a82869e50a0cdd653ba611579f0dd4d5fdd8ab311b86efdf66f5379c5a241b`

Das Skript ist eine **Defektreproduktion**, keine Regressionstestsuite für einen reparierten Stand.
Es verweigert abweichende Quelldateien. Aus dem Repository-Stamm:
`node auswertung/bughunt-20261107/reproduce.cjs /tmp/bughunt-results.json`.
Neun gezielte Prüfungen endeten erfolgreich; die beobachteten Werte stehen in
[`daten/bughunt-20261107/results.json`](daten/bughunt-20261107/results.json).
Diese Zahlen messen keine Spielstärke. Vorläufige Testläufe scheiterten zunächst an einer
fehlenden KOMI-Konstante in der Testumgebung und an einer falschen Erwartung zur
synthetischen UI-2-Stellung; beides wurde im Prüfwerkzeug korrigiert.

## Befund je ID

Alle unten genannten Zeilen beziehen sich auf den Quellencommit, nicht auf spätere Versionen.

| ID | Urteil / Methode | Tatsächlicher Befund | Grenze / noch nötige Prüfung |
|---|---|---|---|
| GTP-1 | Bestätigt; echter Adapterprozess | Nach W A2, W B1 akzeptiert `play B A1` den Suizid mit Erfolg; `list_stones B` enthält A1. Eine aufgebaute Ko-Stellung erlaubt unmittelbare Rücknahme; auch nach zwei Pässen wird die wiederholte Brettstellung akzeptiert. | Keine Aussage, dass die archivierten Messpartien illegale Züge enthielten. Ablehnung vor jeder Zustandsänderung erforderlich. |
| GTP-2 | Bestätigter Aufrufpfad; Instrumentierung + Lesen | Trotz `passNachGegnerpass=1`, eingespieltem Gegnerpass und `genmove B` kommen nur 9 Argumente an; `extra` fehlt. `passNachGegnerpassPruefung` kehrt ohne `extra.gegnerPasste` sofort mit null zurück. | Keine konkrete Auslösestellung gegen den unveränderten Suchpfad ausgespielt. Die fehlende Kontextübergabe ist belegt. |
| GTP-3 | Bestätigt; echter Adapterprozess | `17 protocol_version` und `18 unknown` liefern beide `? unbekannter Befehl` ohne Kennung. Unnummeriert liefert `protocol_version` weiter 2. | Unnummerierte bestehende Clients sind dadurch allein nicht betroffen. |
| UI-1 | Bestätigt im Funktionstest | Original-Toggle schaltet bei Anfrage 5 die KI aus, lässt Anfrage-ID und thinking bestehen. Anschließend wird eine eingespeiste passende Antwort von `applyAIResult` angenommen und setzt einen Stein bei weiterhin ausgeschalteter KI. | Kontrollierte Antwortzustellung statt echter Worker-Race; Browser-Ende-zu-Ende offen. |
| TRAIN-1 | Bestätigter Kontrollfluss; Originalfunktionen mit Trainingsattrappe | Zweiter Pass trainiert einmal und setzt `_trained=true`. Undo öffnet die Partie wieder, lässt Flag und simulierte Gewichtsänderung bestehen. Erneutes Beenden löst keinen zweiten Trainingsaufruf aus. | Keine echten Gewichtsgradienten oder Browserpersistenz gemessen. Der analoge Aufgabepfad wurde statisch gelesen (trainGame(-1) vor showFinalScore), nicht separat dynamisch geprüft. |
| UI-2 | Bestätigt im Funktionstest | In einer synthetischen Schlussstellung zeigt Area Schwarz +353.5. Umschalten auf Territory lässt die Anzeige unverändert, während `buildSGF` `RE[B+352.5]` exportiert. | Originalhandler und Zählfunktionen in DOM-Attrappe; Browseranzeige noch prüfen. |
| UI-3 | Kontrollfluss bestätigt; Cache instrumentiert | Original-Passhandler führt `pass();render();updateUI()` aus. Nach dem Pass entfernt die Invalidierung den Vorschauzustand; der instrumentierte Cache und das gerenderte Bild behalten die alten Markierungen. | Kein echter Canvas-Pixeltest. Gezeigt ist der fehlende Cache-Neuaufbau im untersuchten Passablauf. |
| TRAIN-2 | Bestätigter Reward-Pfad | Original `applyAIResult` legt ein Weiß-Beispiel ab. Der originale Farbhandler wechselt zu Schwarz; nach einem Schwarz-Beispiel und Schwarzsieg reicht das originale `trainGame` an beide Beispiele denselben positiven advantage +1 weiter. Die Pufferfelder enthalten keine Farbe. | `_backward` protokolliert die Argumente, statt echte Gradienten auszuführen; keine Stärkeaussage. |
| NET-1 | Bestätigt; Originalmethode | Bei werfendem `localStorage.removeItem` bricht `PolicyNet.reset()` ab. Der Gewichtsarray ist derselbe, gamesPlayed bleibt im Test bei 17. | Speicherfehler injiziert, kein realer Browser mit gesperrtem Storage. Divergenzpfad ruft laut Code dieselbe Methode auf; nicht eigens ausgelöst. |

## Codebelege

- gtp-ki.js: setze ab Zeile 82, Befehlsparser ab 96, genmove ab 115.
- index.html: Passregel ab 5319, undo ab 5795, pass ab 5861,
  showFinalScore ab 5966, applyAIResult ab 5996.
- index.html: Vorschauinvalidierung ab 6622, render ab 6669,
  KI-Toggle ab 6776, Farbwechsel ab 6790, Wertungswechsel ab 6796,
  Passhandler ab 6802, trainGame ab 7211, reset ab 7356.

## Einordnung für Messungen und gefühlte Spielstärke

**Wichtige Einschränkung der bisherigen Trainingshypothese:** `PARAMS.netMaxBlend`
ist am geprüften Default 0 (index.html:1861); der Getter `blendWeight` (6943)
begrenzt damit den Zugwahleinfluss des lokalen PolicyNet auf 0.
TRAIN-1/TRAIN-2 betreffen echte Fehler der Trainingsverwaltung, erklären aber unter
dieser Einstellung keinen direkten Einfluss gelernter Gewichte auf die Zugwahl.
Bei manuell geändertem netMaxBlend ist das erneut zu prüfen. Die tatsächlich im
Browser gespeicherten Parameter und Gewichte wurden hier nicht gelesen.
Das lokale PolicyNet ist vom gesonderten Endspiel-Netz zu unterscheiden.

Die Untersuchung belegt weder eine allgemeine Regression noch die Ursache der
stark negativen Q-Werte im Aufgabefall. Die entsprechenden Diagnosen bleiben getrennt.

GTP-2 betrifft nur Versuche, die die Passregel über diesen Adapter aktivieren wollen.
Ein direkter Aufruf von passNachGegnerpassPruefung bzw. ein absichtlich deaktivierter
Arm ist dadurch nicht widerlegt. GTP-1 bestätigt eine fehlende Eingangsvalidierung,
keinen nachgewiesenen illegalen Zug in einer bestimmten Messung. Für GTP-3 gilt
entsprechend die Beschränkung auf Clients mit nummerierten Befehlen.

## Nächste Schritte

Zuerst GTP-1 und UI-1 gezielt korrigieren und Fehlerfälle mit Tests absichern, sofern
Hazeberry die jeweilige Änderung freigibt. Für UI-1/UI-2/UI-3 und die Trainingspfade
zusätzlich kurze Browser-Reproduktionen mit echter Oberfläche bzw. Workerzustellung.
TRAIN-1 braucht eine bewusste Strategie für Undo bereits trainierter Partien.
Aus dieser Untersuchung folgt kein Go für Spieländerungen oder Messläufe.
