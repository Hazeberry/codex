# Prior-Anhebung ohne Orakel – gesicherte Daten

Repository: `Hazeberry/codex`, Stand der Messungen
`6bfaa33d69822f13a049b5813d4b6c77b63b61a3`. Vorabfestlegung und Ergebnisnachtrag:
[`docs/prior-anhebung-ohne-orakel.md`](../../prior-anhebung-ohne-orakel.md), §11/12.

| Ordner | Actions-Lauf | Inhalt | Ergebnis |
|---|---:|---|---|
| `engine-vergleich-42164242839` | [42164242839](https://github.com/Hazeberry/codex/actions/runs/42164242839) | Sechs Dumps, Ausgangsstand / neu aus / A, je zwei Archivpartien | Gültig, GLEICH, 130 Abfragen |
| `probe-42164396423` | [42164396423](https://github.com/Hazeberry/codex/actions/runs/42164396423) | 36 Probenpartien, 18 Wiederholungen, vier Archivkontrollen; 198 Dateien im ZIP | Gültig, 70/70 technische Prüfungen |

`artefakt.zip` ist jeweils das unveränderte GitHub-Artefakt. SHA-256 wurde nach dem
Download gegen den von GitHub gelieferten Digest geprüft. Die daneben abgelegten
Berichte und Quellenmetadaten sind unverändert aus dem ZIP entnommen. `lauf.json`
beziehungsweise `run.json`, `jobs.json` und `artefakt.json` sichern die Zuordnung und
Jobzeitstempel. Original-ZIP-Prüfsummen:

```text
90b58898d5023556a01349ce47c9ca1604fcdec6ce6afbe68571ddc9a4884b47  engine-vergleich-42164242839/artefakt.zip
6b9e1bb92b980c9ac25168c2399d58d8c1b2236652e0b81c1c65efe255e25e07  probe-42164396423/artefakt.zip
```

Die Probe umfasst alle Rohzeilen, Einzelpartie-Logs und GTP-/Eingriffsprotokolle;
die Programme GNU Go und Fuego sind nicht darin enthalten. `quellen.json` und die
Paket-Metadaten sichern Code- und Binaryhashes. Der technische Prüfbericht enthält
`auswertung: null`; es wurden keine Endstand-Differenzen oder Siegquoten ausgewertet.

Zur erneuten reinen Datenprüfung aus der Repository-Wurzel (startet keine Partie):

```sh
mkdir -p /tmp/prior-probe-daten
unzip -q docs/daten/prior-anhebung-ohne-orakel/probe-42164396423/artefakt.zip -d /tmp/prior-probe-daten
node auswertung/prior-ohne-orakel/bericht.js /tmp/prior-probe-daten
```

Diese Prüfung wurde nach dem Download ausgeführt; ihr JSON-Prüfbericht stimmt
bytegleich mit dem in Actions erzeugten Bericht überein. Die Unterlagen begründen
keine Aussage über die Wirkung von H und keine Laufzeitgarantie für den Hauptlauf.
