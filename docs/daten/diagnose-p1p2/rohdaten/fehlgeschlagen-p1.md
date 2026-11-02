# P1: Partien ohne Buchung (Actions-Lauf 41480291668)

Erzeugt von `auswertung/diagnose/rohdaten-sichern.js` aus den Ergebniszeilen von P1. Eine Partie zählt hier, wenn ihre Zeile keine `buchung` trägt (Fehler beim Auswerten). Nichts wurde neu gerechnet.

Gesamt: 2 Partien.

| Archiv | Nr. | Seed | Züge | Farbe der KI | Fehlermeldung |
|---|---:|---:|---:|---|---|
| fuego-siege-D | 450 | 22800450 | 361 | S | final_status_list dead → ? GNU Go beendet (null, SIGSEGV) |
| fuego-siege-D | 585 | 22800585 | 342 | W | final_status_list dead → ? GNU Go beendet (null, SIGSEGV) |

Diese Partien fehlen in P1. Ob sie die Aussage ändern würden, ist nicht untersucht; die Schwelle der Vorabfestlegung (mindestens 98 % je Archiv) ist unabhängig davon erfüllt oder nicht (siehe Bericht).
