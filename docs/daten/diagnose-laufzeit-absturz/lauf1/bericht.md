# Diagnose Laufzeit und Absturz

Historischer Stand: `8740574aa6f3d572b1d234d58202008d71404fb2`.

Diagnostischer Lauf; keine neue Messung der Spielstärke.

## g-A-127

Reproduktion: True; neue Dauer 13.7 s.

| Komponente | Abfragen | Summe s | Maximum s |
|---|---:|---:|---:|
| GNU Go Stufe 10: reg_genmove | 1 | 5.928 | 5.928 |
| GNU Go Stufe 1: genmove | 43 | 4.974 | 0.451 |
| KI | 41 | 2.613 | 0.136 |
| GNU Go Stufe 1: estimate_score | 2 | 0.085 | 0.045 |
| GNU Go Stufe 1: play | 123 | 0.022 | 0.001 |
| GNU Go Stufe 10: play | 82 | 0.013 | 0.001 |
| GNU Go Stufe 1: boardsize | 2 | 0.005 | 0.003 |
| GNU Go Stufe 10: boardsize | 1 | 0.003 | 0.003 |
| GNU Go Stufe 10: komi | 1 | 0.001 | 0.001 |
| GNU Go Stufe 1: clear_board | 2 | 0.000 | 0.000 |
| GNU Go Stufe 1: komi | 2 | 0.000 | 0.000 |
| GNU Go Stufe 10: clear_board | 1 | 0.000 | 0.000 |

Erster SIGSEGV nach 82 Zügen bei `genmove B`; erster Auslöser mc=81.

## g-N-127

Reproduktion: True; neue Dauer 13.4 s.

| Komponente | Abfragen | Summe s | Maximum s |
|---|---:|---:|---:|
| GNU Go Stufe 10: reg_genmove | 1 | 5.614 | 5.614 |
| GNU Go Stufe 1: genmove | 43 | 4.933 | 0.433 |
| KI | 41 | 2.665 | 0.135 |
| GNU Go Stufe 1: estimate_score | 2 | 0.088 | 0.049 |
| GNU Go Stufe 1: play | 123 | 0.021 | 0.002 |
| GNU Go Stufe 10: play | 82 | 0.015 | 0.002 |
| GNU Go Stufe 1: boardsize | 2 | 0.004 | 0.003 |
| GNU Go Stufe 10: boardsize | 1 | 0.002 | 0.002 |
| GNU Go Stufe 1: clear_board | 2 | 0.000 | 0.000 |
| GNU Go Stufe 1: komi | 2 | 0.000 | 0.000 |
| GNU Go Stufe 10: clear_board | 1 | 0.000 | 0.000 |
| GNU Go Stufe 10: komi | 1 | 0.000 | 0.000 |

Erster SIGSEGV nach 82 Zügen bei `genmove B`; erster Auslöser mc=81.

## g-P-127

Reproduktion: True; neue Dauer 13.4 s.

| Komponente | Abfragen | Summe s | Maximum s |
|---|---:|---:|---:|
| GNU Go Stufe 10: reg_genmove | 1 | 5.624 | 5.624 |
| GNU Go Stufe 1: genmove | 43 | 4.911 | 0.404 |
| KI | 41 | 2.637 | 0.148 |
| GNU Go Stufe 1: estimate_score | 2 | 0.087 | 0.047 |
| GNU Go Stufe 1: play | 123 | 0.031 | 0.013 |
| GNU Go Stufe 10: play | 82 | 0.012 | 0.000 |
| GNU Go Stufe 1: boardsize | 2 | 0.005 | 0.003 |
| GNU Go Stufe 10: boardsize | 1 | 0.003 | 0.003 |
| GNU Go Stufe 1: komi | 2 | 0.000 | 0.000 |
| GNU Go Stufe 1: clear_board | 2 | 0.000 | 0.000 |
| GNU Go Stufe 10: komi | 1 | 0.000 | 0.000 |
| GNU Go Stufe 10: clear_board | 1 | 0.000 | 0.000 |

Erster SIGSEGV nach 82 Zügen bei `genmove B`; erster Auslöser mc=81.

## g-S-127

Reproduktion: True; neue Dauer 14.4 s.

| Komponente | Abfragen | Summe s | Maximum s |
|---|---:|---:|---:|
| GNU Go Stufe 10: reg_genmove | 1 | 5.958 | 5.958 |
| GNU Go Stufe 1: genmove | 43 | 5.281 | 0.414 |
| KI | 41 | 2.887 | 0.150 |
| GNU Go Stufe 1: estimate_score | 2 | 0.095 | 0.052 |
| GNU Go Stufe 1: play | 123 | 0.022 | 0.002 |
| GNU Go Stufe 10: play | 82 | 0.014 | 0.002 |
| GNU Go Stufe 1: boardsize | 2 | 0.004 | 0.002 |
| GNU Go Stufe 10: boardsize | 1 | 0.002 | 0.002 |
| GNU Go Stufe 1: clear_board | 2 | 0.000 | 0.000 |
| GNU Go Stufe 1: komi | 2 | 0.000 | 0.000 |
| GNU Go Stufe 10: clear_board | 1 | 0.000 | 0.000 |
| GNU Go Stufe 10: komi | 1 | 0.000 | 0.000 |

Erster SIGSEGV nach 82 Zügen bei `genmove B`; erster Auslöser mc=81.

## f-P-27

Reproduktion: True; neue Dauer 783.7 s.

Archiv: 1117.8 s, 282 Züge.
Zugfolge und Endstand werden exakt gegen das Archiv geprüft.

| Komponente | Abfragen | Summe s | Maximum s |
|---|---:|---:|---:|
| GNU Go Stufe 10: reg_genmove | 101 | 766.588 | 262.458 |
| Fuego: genmove | 141 | 8.289 | 0.100 |
| KI | 141 | 8.113 | 0.096 |
| GNU Go Stufe 1: final_score | 1 | 0.164 | 0.164 |
| GNU Go Stufe 1: estimate_score | 4 | 0.137 | 0.052 |
| Fuego: boardsize | 1 | 0.132 | 0.132 |
| Fuego: play | 141 | 0.085 | 0.002 |
| GNU Go Stufe 1: play | 282 | 0.047 | 0.002 |
| GNU Go Stufe 10: play | 282 | 0.021 | 0.000 |
| Fuego: deterministic_mode | 1 | 0.010 | 0.010 |
| GNU Go Stufe 10: boardsize | 1 | 0.002 | 0.002 |
| GNU Go Stufe 1: boardsize | 1 | 0.002 | 0.002 |
| GNU Go Stufe 1: list_stones | 2 | 0.001 | 0.000 |
| Fuego: uct_param_player | 3 | 0.000 | 0.000 |
| Fuego: komi | 1 | 0.000 | 0.000 |
| Fuego: clear_board | 1 | 0.000 | 0.000 |
| Fuego: list_stones | 2 | 0.000 | 0.000 |
| Fuego: set_random_seed | 1 | 0.000 | 0.000 |
| GNU Go Stufe 1: komi | 1 | 0.000 | 0.000 |
| GNU Go Stufe 1: clear_board | 1 | 0.000 | 0.000 |
| GNU Go Stufe 10: clear_board | 1 | 0.000 | 0.000 |
| GNU Go Stufe 10: komi | 1 | 0.000 | 0.000 |

## f-S-27

Reproduktion: True; neue Dauer 1198.5 s.

Archiv: 1112.3 s, 374 Züge.
Zugfolge und Endstand werden exakt gegen das Archiv geprüft.

| Komponente | Abfragen | Summe s | Maximum s |
|---|---:|---:|---:|
| GNU Go Stufe 10: reg_genmove | 147 | 1160.635 | 401.165 |
| KI | 187 | 18.853 | 0.156 |
| Fuego: genmove | 187 | 17.886 | 0.163 |
| GNU Go Stufe 1: estimate_score | 4 | 0.331 | 0.175 |
| Fuego: boardsize | 1 | 0.191 | 0.191 |
| Fuego: play | 187 | 0.114 | 0.004 |
| GNU Go Stufe 1: play | 374 | 0.092 | 0.004 |
| GNU Go Stufe 1: final_score | 1 | 0.062 | 0.062 |
| GNU Go Stufe 10: play | 374 | 0.053 | 0.001 |
| Fuego: deterministic_mode | 1 | 0.017 | 0.017 |
| GNU Go Stufe 10: boardsize | 1 | 0.003 | 0.003 |
| GNU Go Stufe 1: boardsize | 1 | 0.002 | 0.002 |
| GNU Go Stufe 1: list_stones | 2 | 0.001 | 0.001 |
| Fuego: uct_param_player | 3 | 0.001 | 0.000 |
| Fuego: komi | 1 | 0.001 | 0.001 |
| Fuego: list_stones | 2 | 0.000 | 0.000 |
| Fuego: clear_board | 1 | 0.000 | 0.000 |
| Fuego: set_random_seed | 1 | 0.000 | 0.000 |
| GNU Go Stufe 1: komi | 1 | 0.000 | 0.000 |
| GNU Go Stufe 1: clear_board | 1 | 0.000 | 0.000 |
| GNU Go Stufe 10: clear_board | 1 | 0.000 | 0.000 |
| GNU Go Stufe 10: komi | 1 | 0.000 | 0.000 |

## Gemeinsame Absturzstellung

Alle vier reproduzierten Zugfolgen bis zum ersten SIGSEGV gleich: True.
Kein vorheriger Auslöser c/d/d1 in jedem Arm: False.
Das identifiziert die erreichte Stellung und die zeitliche Lage zum Eingriff; es erklärt noch keinen Fehler im GNU-Go-Quellcode.

## Grenzen

Zeitanteile stammen aus instrumentierten Wiederholungen auf anderen Runnern. Die historischen Archive enthalten keine vollständige Zeitzerlegung; gleiche Gesamtsekunden werden nicht vorausgesetzt. Nicht identische Zugfolgen erlauben keine Erklärung der historischen langsamen Partie.
GNU-Go-Verwandtschaft und Nutzen einer internen Prior-Auswahl werden hier nicht getestet.

**GÜLTIG**
