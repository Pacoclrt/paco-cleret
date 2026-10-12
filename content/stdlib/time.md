---
title: Dates, heures et durées (time)
category: stdlib
order: 6
level: intermédiaire
summary: time.Now() donne l'instant présent, time.Duration représente une durée (5 * time.Second), et le formatage utilise une date de référence : "2006-01-02 15:04:05". On compare avec Before, After et Equal.
aliases: time, temps, date, dates, heure, heures, durée, duration, time.now, time.since, time.sleep, sleep, pause, attendre, formater une date, format date, parse date, 2006-01-02, layout, fuseau horaire, timezone, location, utc, timestamp, unix, ticker, timer, chronomètre, mesurer le temps, minuteur
related: select, context, faq-timeout, conversions
questions:
  - Comment obtenir la date et l'heure actuelles ?
  - Comment formater une date en Go (pourquoi 2006-01-02) ? -> formater
  - Comment convertir une chaîne en date (parse) ? -> parser
  - Comment mesurer le temps d'exécution d'une fonction ? -> mesurer
  - Comment faire une pause (sleep) ? -> durees
  - Comment ajouter des jours à une date ? -> calculs
  - Comment gérer les fuseaux horaires ? -> fuseaux
  - Comment exécuter du code à intervalles réguliers ? -> ticker-timer
---

@@ rapide

```go
maintenant := time.Now()
fmt.Println(maintenant.Format("02/01/2006 15:04")) // 12/10/2026 14:30

d := 90 * time.Minute
fmt.Println(d)                     // 1h30m0s
time.Sleep(500 * time.Millisecond) // pause

demain := maintenant.AddDate(0, 0, 1)
fmt.Println(demain.After(maintenant)) // true

debut := time.Now()
traitement()
fmt.Println("durée :", time.Since(debut)) // mesure d'une durée

t, err := time.Parse("2006-01-02", "2024-07-14")
```

Le format ne s'écrit **pas** avec `YYYY-MM-DD` mais avec une **date de référence** : **`Mon Jan 2 15:04:05 MST 2006`**, soit `01/02 03:04:05PM '06 -0700` (1, 2, 3, 4, 5, 6, 7).

@@ detail

## L'instant présent et les dates {#instant}

```go
t := time.Now()
fmt.Println(t.Year(), t.Month(), t.Day()) // 2026 October 12
fmt.Println(t.Hour(), t.Minute(), t.Second())
fmt.Println(t.Weekday()) // Monday
fmt.Println(t.YearDay()) // jour de l'année

// Construire une date précise
noel := time.Date(2026, time.December, 25, 20, 0, 0, 0, time.Local)
```

`time.Date` normalise les valeurs hors limites : le 32 janvier devient le 1er février.

## Les durées {#durees}

`time.Duration` est un `int64` qui compte des **nanosecondes**, avec des constantes pratiques :

```go
time.Nanosecond, time.Microsecond, time.Millisecond, time.Second, time.Minute, time.Hour

d := 2*time.Hour + 30*time.Minute
fmt.Println(d)           // 2h30m0s
fmt.Println(d.Minutes()) // 150
fmt.Println(d.Round(time.Hour)) // 3h0m0s

d2, _ := time.ParseDuration("1h15m30s")
time.Sleep(200 * time.Millisecond)
```

:::warning Multiplier par une variable
`time.Second * 5` fonctionne (constante non typée), mais avec une variable `int` il faut convertir :

```go
n := 5
time.Sleep(time.Duration(n) * time.Second) // ✅
time.Sleep(n * time.Second)                // ❌ mismatched types int and time.Duration
```
:::

Il n'existe pas de constante pour les jours : `24 * time.Hour` (mais attention aux changements d'heure, voir `AddDate`).

## Mesurer un temps d'exécution {#mesurer}

```go
debut := time.Now()
resultat := calculLong()
ecoule := time.Since(debut)
fmt.Printf("calcul : %v (%d ms)\n", ecoule, ecoule.Milliseconds())
```

`time.Now()` contient une lecture d'**horloge monotone** : `time.Since` reste correct même si l'heure du système est modifiée pendant la mesure. Pour des mesures fiables de performance, utilisez plutôt les benchmarks (voir [[tests#benchmarks]]).

## Calculs sur les dates {#calculs}

```go
t := time.Date(2026, 1, 31, 10, 0, 0, 0, time.UTC)

t.Add(36 * time.Hour)    // + 36 heures
t.Add(-15 * time.Minute) // - 15 minutes
t.AddDate(0, 1, 0)       // + 1 mois : 3 mars (31 février normalisé !)
t.AddDate(1, 0, -7)      // + 1 an - 7 jours

fin := time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC)
d := fin.Sub(t) // durée entre deux dates
fmt.Println(int(d.Hours()/24), "jours")

t.Truncate(time.Hour) // arrondi à l'heure inférieure
```

## Comparer {#comparer}

```go
a := time.Now()
b := a.Add(time.Second)
a.Before(b)  // true
a.After(b)   // false
a.Equal(b)   // false
a.Compare(b) // -1 (Go 1.20+)
t.IsZero()   // vrai pour la valeur zéro time.Time{}
```

:::warning Pas de == entre deux time.Time
`==` compare aussi le fuseau et la lecture monotone : deux instants identiques peuvent être « différents ». Utilisez **`Equal`**.
:::

## Formater {#formater}

Go utilise une **date de référence** au lieu de codes comme `%Y` ou `YYYY`. Cette date est le **2 janvier 2006 à 15:04:05**, fuseau `-0700`. On écrit le format en montrant comment **cette date-là** doit apparaître :

| Élément | Symbole | Exemple |
|---|---|---|
| Année | `2006` / `06` | 2026 / 26 |
| Mois | `01` / `1` / `Jan` / `January` | 10 / 10 / Oct / October |
| Jour | `02` / `2` / `_2` | 05 / 5 / ␣5 |
| Jour de la semaine | `Mon` / `Monday` | Mon / Monday |
| Heure (24 h) | `15` | 14 |
| Heure (12 h) | `03` / `3` + `PM` | 02 PM |
| Minutes | `04` | 30 |
| Secondes | `05` | 09 |
| Fractions | `.000` / `.000000` | .123 |
| Fuseau | `MST` / `-0700` / `Z07:00` | CET / +0100 / +01:00 |

```go
t := time.Date(2026, 3, 5, 14, 7, 9, 0, time.UTC)

t.Format("2006-01-02")            // 2026-03-05
t.Format("02/01/2006 à 15h04")    // 05/03/2026 à 14h07
t.Format("Monday 2 January 2006") // Thursday 5 March 2026
t.Format(time.RFC3339)            // 2026-03-05T14:07:09Z
t.Format(time.Kitchen)            // 2:07PM
t.Format(time.DateTime)           // 2026-03-05 14:07:09 (Go 1.20+)
```

Constantes utiles : `time.RFC3339` (le format des API et du JSON), `time.DateOnly` (`2006-01-02`), `time.TimeOnly` (`15:04:05`), `time.DateTime`.

:::tip Les noms sont en anglais
`Monday` et `January` produisent des noms anglais. Pour du français, utilisez une table de correspondance : `jours := [...]string{"dimanche", "lundi", …}[t.Weekday()]`.
:::

## Parser une date {#parser}

`time.Parse` utilise le même système de format :

```go
t, err := time.Parse("02/01/2006", "14/07/2024")
if err != nil {
	log.Fatal(err)
}
fmt.Println(t.Year(), t.Month()) // 2024 July

t2, err := time.Parse(time.RFC3339, "2024-07-14T10:30:00+02:00")
```

Sans information de fuseau dans la chaîne, `time.Parse` suppose **UTC**. Pour interpréter l'heure dans un fuseau donné : `time.ParseInLocation(format, valeur, loc)`.

## Fuseaux horaires {#fuseaux}

```go
paris, err := time.LoadLocation("Europe/Paris")
if err != nil {
	log.Fatal(err)
}
t := time.Now().In(paris)
fmt.Println(t.Format("15:04 MST")) // 14:30 CEST

utc := time.Now().UTC()
```

Bonne pratique : **stocker et échanger en UTC**, convertir dans le fuseau de l'utilisateur seulement pour l'affichage. Si le système n'a pas de base de fuseaux (conteneur minimal), importez `_ "time/tzdata"`.

## Timestamps Unix {#unix}

```go
ts := time.Now().Unix() // secondes depuis le 1er janvier 1970 UTC
ms := time.Now().UnixMilli()
t := time.Unix(1700000000, 0) // timestamp → time.Time
```

## Ticker et Timer {#ticker-timer}

```go
// Ticker : à intervalles réguliers
ticker := time.NewTicker(2 * time.Second)
defer ticker.Stop()
for t := range ticker.C {
	fmt.Println("tic à", t.Format("15:04:05"))
}

// Timer : une seule fois, annulable
timer := time.NewTimer(5 * time.Second)
select {
case <-timer.C:
	fmt.Println("délai écoulé")
case <-annulation:
	timer.Stop()
}

// Exécuter une fonction plus tard
time.AfterFunc(time.Minute, func() { fmt.Println("une minute plus tard") })
```

`time.After(d)` est un raccourci pour un timer à usage unique, idéal dans un `select` (voir [[select#timeout]]).
