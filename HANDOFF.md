# Übergabe – Arbeit in Hazeberry/codex (Stand 06.11.2026)

## Aktueller Stand in diesem Repository
- Ziel der weiteren Arbeit: `Hazeberry/codex`. Vollständiger Import mit Historie durch
  PR #1, Merge `1bf2ff3cc5258038697b91a79224c70e25761d87`.
- Vorabfestlegung für die Prior-Anhebung ohne Orakel: `docs/prior-anhebung-ohne-orakel.md`.
  Umsetzung A/H/R samt Tests und manuellen Workflows durch PR #7 gemergt; Stand
  `6bfaa33d69822f13a049b5813d4b6c77b63b61a3`. Standard aus, keine UI-Aktivierung.
- Hazeberry gab nach Durchsicht/Konkretisierung §10 Go für Merge, Engine-Vergleich und
  technische Probe. Diese Freigaben sind ausgeführt; kein Hauptlauf-Go.
- Engine-Vergleich 42164242839 **gültig, GLEICH**: 130 KI-Abfragen, Auswahlbewertung ab
  Zug 81 an je 25 Stellen für Schwarz/Weiß. Ausgangsstand, neu aus und A stimmen bei
  Zügen, Kindern, Priors, N/W und Suchzufallsverbrauch überein; keine weitergehende Abdeckung.
- Technische Probe 42164396423 **gültig**, 58/58 Partien, 70/70 Pflichtprüfungen,
  keine Ausfälle/Timeouts. 18 Wiederholungen identisch, vier Archivkontrollen passend;
  H/R gegen beide Gegner in beiden Farben tatsächlich angehoben. Maximum 44,3 s.
- **Keine Wirkungsauswertung** aus der Probe. Ob H hilft oder besser als R ist, bleibt
  offen. Hauptumfang (Vorschlag 480 je Arm/Gegner), Budget und Pakete sind noch festzulegen;
  Hauptlauf braucht eigenes Go. GNU-Go-geprägte Daten und GNU-Go-Wertung bleiben enthalten.
- Ergebnisse §11/12, vollständige Rohartefakte unter
  `docs/daten/prior-anhebung-ohne-orakel/`. Quellen-SHA und SHA-256 sind gesichert.
- **Diagnose abgeschlossen, gültig:** Lauf 42130235314, Versuch 2, mit drei übernommenen
  Reproduktionen aus Lauf 42124976320. Alle sechs Pflichtreproduktionen bestanden.
  Bericht: `docs/diagnose-laufzeit-absturz.md`; Rohdaten und Actions-Bericht unter
  `docs/daten/diagnose-laufzeit-absturz/lauf1/`. Die Diagnose selbst ändert keinen Spielcode.
- In den beiden untersuchten langen Fuego-Partien dominiert die Wartezeit beim
  GNU-Go-Orakel: P 766,6 von 783,7 s, S 1160,6 von 1198,5 s. Zugfolgen und Endstände
  stimmen exakt mit dem Archiv überein. Die interne GNU-Go-Lesefunktion ist nicht ermittelt.
- GNU Go stürzt in allen vier Wiederholungen nach identischer Zugfolge mit Zug 82
  (Weiß K8) bei `genmove B` ab. Erster Auslöser war bereits `mc=81`, mit tatsächlichem
  Eingriff in N und S. **Die Vermutung „vor dem ersten Eingriff“ ist damit widerlegt.**
  Eigenständiges GTP-Replay unter GDB reproduziert den SIGSEGV; Quellcodeursache offen.
- PR #6 ist nach Konfliktauflösung gemergt: `d688b257f8499d8c0a62e9639ecfde3b7f21a07d`.
  Die historischen Angaben darunter stammen aus der übernommenen Übergabe.
- Node- und Browser-CI von PR #7 waren grün. Die Abmeldung der PR-Aktivität wurde
  versucht; GitHub verweigerte `updateSubscription` mit FORBIDDEN (App-Berechtigung).

## Aktuelle Einzelfall-Diagnose: Aufgabe nach Zug 113

- Nutzer-Go vom 06.11.2026, Untersuchung in PR #10 gemergt:
  `0756a9f67ff255a7e2ed6746cd1549ac80ff2a39`.
- Lauf 42169766921 gültig: 22 externe Bewertungen, sechs vollständige Fortsetzungen.
  Weiß gewinnt alle sechs gegen GNU Go 1; eigene KI mit 3000 Simulationen
  W+72,5/W+136,5. Deutlicher Befund für voreilige Aufgabe in diesem Fall,
  technische Ursache der negativen Q-Werte noch offen. Keine Defaultänderung.
- Bericht: `docs/untersuchung-aufgabe-113.md`, Rohartefakte unter
  `docs/daten/aufgabe-113/lauf1/`, Quellenstand `09cdb2be87d693f6eb89a190274e7e49f5769b9a`.
- Separater Protokollfehler: Undo ließ alte KI-Diagnosen stehen (P14/P13 bei Zug 42).
  Korrektur in PR #9 nach grüner CI 42169061237 gemergt:
  `0a0cc366cb9bdd33d8d3048c26e5d4ef3408c92d`.

## deathTransfer-Diagnose abgeschlossen

- Aufbau PR #12 nach Go und grüner CI gemergt: `8ad41af0c0e67da49b6caf8653c3bd5695d44960`.
- Lauf 42256206462 gültig: 32 Pakete, 192 Abfragen plus 192 bestandene Messkontrollen.
  Dosen 0/0,5/1, acht Stellungen, zwei Farben/Seeds und 120/3000 Simulationen.
- An beiden aktuellen Aufgabestellungen bleibt Q auch ohne Transfer unter −0,95;
  bereits gebuchte Gefangene dominieren dort. Vor Gruppenverlusten und in der
  historischen Stellung kann Transfer Q deutlich beeinflussen. In 64/64 Kontexten
  blieb der gewählte Zug zwischen Dosis 0 und 1 gleich; kein Spielstärkeurteil.
- Bericht: `docs/death-transfer-diagnose.md`, vollständige Rohdaten unter
  `docs/daten/death-transfer/lauf1/`. Keine Defaultänderung, keine neuen Partien.
- Nächste Ursachenfrage: Gefangenenterm/Rollout-Verluste/Skalierung und Q-Aufgabe.
  Kein Go für neue Partien oder Spieländerungen aus dieser Diagnose ableiten.
- PR-Aktivität abmelden versucht; GitHub verweigerte die Mutation (FORBIDDEN).

## Herkunft der folgenden Übergabe

Übernommen aus `Hazeberry/Go-html-Game-MoE`, Commit
`818ba2a54763a9977b802f48b74b9f41aaee868b`, ursprünglicher Branch `ccr-00c70722-9f7z7m`.
Die PR- und Laufnummern der historischen Merges und Spielstärke-Ergebnisse beziehen
sich auf **das ursprüngliche Repository**. Diese Spielstärke-Zahlen wurden übernommen
und nicht neu berechnet. Verweise auf die neue technische Diagnose und die Branchliste
beziehen sich auf `Hazeberry/codex`.

## Merges (Commit auf main)
| PR | Inhalt | Merge |
|---|---|---|
| #265 / #266 | Vorabfestlegung und Umsetzung Stufe 1 (Schalter `extra.kandidatenOrakel`, Standard aus) | `1d3dd75` / `1c71b02` |
| #267 | Nachtrag Laufzeitprobe Stufe 1, Rohdaten | `5b42448` |
| #268 | Workflow Hauptversuch Stufe 1, Prior-Prüfung, vollständige Paare | `370df8e` |
| #269 | Nachtrag Hauptversuch Stufe 1 (§13), Rohdaten | `c45298a` |
| #270 | Vorabfestlegung Vierarm-Versuch (§12 Engine-Vergleich nachgetragen) | `4eb8dee` |
| #272 | Engine-Vergleich in Actions, Regel in CLAUDE.md | `f87f148` |
| #271 | Umsetzung Vierarm (Arme N, P, pEnd, Bericht, Workflows, Tests) | `bd93a21` |
| #273 | Nachtrag technische Probe Vierarm (§13), Rohdaten | `8740574` |
| #274 | Nachtrag Hauptlauf Vierarm (§14), Rohdaten | `645a325` |

## Ergebnisse
**Stufe 1** (Lauf 41563696817, Seeds 231/232, gültig, §13 in `docs/kandidaten-orakel.md`):
- S − A: GNU Go +24,7 [+19,9; +29,5] (478 Paare), Fuego +36,0 [+30,1; +42,0] (480 Paare).
- Der kombinierte Eingriff (Orakelzug als zusätzliches Wurzelkind mit Spitzenprior) verbessert den Endstand.
  ZS (Rang-Nachbar) verschlechtert ihn; das ist keine isoliert gemessene Eingriffskost.
- Siegquote gegen Fuego mit 100 Spielen je Zug. Die frühere 48-%-Messung (50 Spiele je Zug) ist nicht direkt vergleichbar.

**Vierarm-Versuch** (§14 in `docs/kandidaten-orakel-vierarm.md`, Hauptlauf 41627980348, Seeds 234/235, gültig):
- N − A: kein nachgewiesener Unterschied (GNU Go +0,7 [−5,2; +6,6], Fuego −0,9 [−6,9; +5,1]).
- S − N: positiv (+26,3 GNU Go; +30,4 Fuego). P − A: positiv (+13,8 GNU Go; +11,7 Fuego).
- Nicht getrennt voneinander abgezogen; die Mittelwerte sind additiv (N − A) + (S − N) = S − A.
- Ausfall: Partie 127 gegen GNU Go in allen Armen (SIGSEGV). Die damalige Vermutung
  einer Stellung vor dem ersten Eingriff wurde durch die neue Diagnose korrigiert (siehe oben).
- Laufzeit: 83,5 h Partiezeit, rund 4 h 40 min Wanduhr. Einzelne Fuego-Partien bis 1118 s;
  die neue Diagnose ordnet deren dominanten Zeitanteil den GNU-Go-Orakelabfragen zu.

**Engine-Vergleich** (Lauf 41617738140, alt `370df8e`, neu `e0de66f`): GLEICH über 26 Replays und 1328 KI-Abfragen.
Die Vorprüfung ist bestanden. Abdeckung: S und ZS nur 22 bzw. 16 Stellen ab Zug 81, für ZS nur 5 mit Fall d.
Fall d1, e, c0 und d0 kamen nicht vor.

## Historische offene Punkte aus der übernommenen Übergabe (05.11.2026)
- **GNU-Go-Verwandtschaft:** Hypothese, Ursache nicht nachgewiesen. Dass der Gewinn auch gegen Fuego auftrat,
  spricht gegen eine rein gegnerspezifische Ausnutzung. Er trennt aber nicht den Einfluss von (a) dem
  GNU-Go-Orakel, (b) den GNU-Go-geprägten Netz- und Musterdaten und (c) der GNU-Go-Wertung (Endstand-Zählung).
- **Interne GNU-Go-Ursachen:** Die beiden langen Fuego-Partien und der Absturz sind
  reproduziert und zeitlich eingegrenzt. Offen bleiben die GNU-Go-Funktion hinter den
  teuren Orakelabfragen und der Quellcodefehler hinter dem SIGSEGV. Der GDB-Backtrace
  enthält keine GNU-Go-Funktionsnamen. Stellungsgleichheit ist bestätigt, die frühere
  Vermutung „vor dem ersten Eingriff“ widerlegt; siehe Diagnosebericht.
- **Nutzung ohne Orakel:** offen. Der Versuch zeigt, dass die Prior-Anhebung hilft, auch bei Zügen, die schon
  Kandidaten sind (P − A +13,8 und +11,7; S − N positiv). Arm P braucht aber GNU Go, um zu wissen, welchen Zug
  er anheben soll. N − A zeigt keinen nachgewiesenen Gewinn; das ist **kein** Beleg für Wirkungslosigkeit.
  Die nächste Frage: Lässt sich die nützliche Anhebung mit einer rein engineinternen Regel finden? Eine solche
  Regel dürfte das Orakel nicht als Eingabe nutzen, sonst bliebe die Abhängigkeit bestehen. Das ist eine neue
  Fragestellung mit eigener Vorabfestlegung und eigenem Go. Der neue Entwurf steht in
  `docs/prior-anhebung-ohne-orakel.md`. Aktueller Stand: siehe oben und §11/12; nur die
  Wirksamkeitsfrage und der Hauptlauf bleiben für diese konkrete Regel offen.

## Regeln aus den letzten Sitzungen
- **Nur ein ausdrückliches „Go“ startet einen Lauf** oder merged einen PR. Eine Empfehlung ist kein Go. Diesen Fehler gab es einmal (Engine-Vergleich), er ist im Nachtrag vermerkt.
- Messungen laufen ausschließlich in GitHub Actions. Engine-Vergleiche je Stand in einem eigenen Prozess, nie zwei Stände im selben Node-Prozess (CLAUDE.md).
- „Gleich“ erst nach Vorprüfung (Priors je Wurzelkind vorhanden und endlich, Abdeckung der Arme und Fälle), sonst KEIN URTEIL.
- Zulässige Partieausfälle stehen getrennt von bestandenen Prüfungen. Ein fehlendes Pflichtprotokoll ist kein Ausfall, sondern KEIN URTEIL.
- Merge mit voller Kopf-SHA (`expectedHeadSha`), Merge-Methode `merge`. Docs mit Vorgaben vor dem Merge von Hazeberry lesen lassen.

## Branches

- In `Hazeberry/codex` nach Merge löschbar, nicht gelöscht: `claude/repository-import`
  (#1), `claude/prior-anhebung-ohne-orakel` (#2), `claude/diagnose-laufzeit-absturz` (#3),
  `claude/diagnose-laufzeit-fortsetzen` (#4), `claude/diagnose-ergebnissicherung` (#5),
  `claude/prior-ohne-orakel-umsetzung` (#7) und `claude/prior-ohne-orakel-probe-ergebnisse` (#8).
- `claude/diagnose-laufzeit-ergebnisse` ist nach Merge von PR #6 ebenfalls löschbar.
- `claude/diagnose-undo-protokoll` ist nach Merge von PR #9 ebenfalls löschbar.
- `claude/aufgabe-113-untersuchung` (#10) und `claude/death-transfer-diagnose` (#12)
  sind nach Merge ebenfalls löschbar.
- `claude/death-transfer-ergebnisse` bleibt bis zum Merge des Ergebnisnachtrags erhalten.
- Die historische Liste löschbarer Branches aus der alten Übergabe gilt ausschließlich
  für `Hazeberry/Go-html-Game-MoE`; daraus folgt kein Löschauftrag in einem der Repositories.
