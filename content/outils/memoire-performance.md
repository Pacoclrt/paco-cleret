---
title: Mémoire et performance
category: outils
order: 3
level: avancé
summary: Go alloue sur la pile ou sur le tas selon l'analyse d'échappement, et un ramasse-miettes concurrent libère la mémoire. Pour optimiser, mesurer d'abord (benchmarks, pprof), puis réduire les allocations (préallocation, strings.Builder, sync.Pool).
aliases: performance, performances, optimisation, optimiser, rapide, lent, mémoire, memory, pile, tas, stack, heap, allocation, allocations, escape analysis, analyse d'échappement, garbage collector, ramasse-miettes, gc, gogc, gomemlimit, pprof, profilage, profiling, profiler, benchmark, préallocation, fuite mémoire, memory leak
related: tests, slices, pointeurs, sync, faq-concat-rapide
questions:
  - Comment optimiser un programme Go ?
  - Quelle différence entre la pile (stack) et le tas (heap) ? -> pile-tas
  - Comment fonctionne le garbage collector de Go ? -> gc
  - Comment profiler un programme avec pprof ? -> pprof
  - Comment réduire les allocations mémoire ? -> allocations
  - Comment voir quelles variables s'échappent sur le tas ? -> escape-analysis
---

@@ rapide

1. **Mesurez avant d'optimiser** : écrivez un benchmark (`go test -bench . -benchmem`) et profilez (`pprof`).
2. **Réduisez les allocations** : c'est la source n°1 de lenteur en Go.

```go
// Préallouer quand la taille est connue
res := make([]string, 0, len(entrees))

// Construire des chaînes avec un Builder
var sb strings.Builder

// Éviter les conversions inutiles []byte ↔ string dans les boucles chaudes
```

```bash
go test -bench=. -benchmem -cpuprofile=cpu.out
go tool pprof -http=:8080 cpu.out
go build -gcflags=-m    # voir ce qui s'échappe sur le tas
```

Go gère la mémoire automatiquement : un **ramasse-miettes** (GC) concurrent libère ce qui n'est plus référencé. Pas de `free`, et pas de fuite… tant qu'on ne garde pas de références inutiles (goroutines bloquées, caches qui grossissent).

@@ detail

## La pile et le tas {#pile-tas}

| | Pile (stack) | Tas (heap) |
|---|---|---|
| Rattachée à | une goroutine | tout le programme |
| Allocation | quasi gratuite (déplacer un pointeur) | plus coûteuse |
| Libération | automatique au retour de la fonction | par le ramasse-miettes |
| Contient | variables locales qui ne survivent pas à la fonction | valeurs partagées ou qui survivent |

En Go, **vous ne choisissez pas** : c'est le compilateur qui décide, grâce à l'analyse d'échappement.

## L'analyse d'échappement {#escape-analysis}

Si le compilateur peut prouver qu'une valeur ne survit pas à sa fonction, il la place sur la pile. Sinon, elle « s'échappe » sur le tas.

```go
func surLaPile() int {
	x := 42 // ne quitte pas la fonction : pile
	return x
}

func surLeTas() *int {
	x := 42
	return &x // l'adresse sort de la fonction : x s'échappe sur le tas
}
```

```bash
go build -gcflags=-m ./...
```

```output
./main.go:9:2: moved to heap: x
```

Causes fréquentes d'échappement : renvoyer un pointeur, stocker dans une interface (`any`, `fmt.Println`), capturer dans une closure qui survit, valeurs trop grosses ou de taille inconnue à la compilation.

## Le ramasse-miettes {#gc}

Le GC de Go est **concurrent** (il travaille en même temps que votre programme) et vise des pauses très courtes (souvent moins d'une milliseconde). Deux réglages :

| Variable | Effet |
|---|---|
| `GOGC` (défaut 100) | le GC se déclenche quand le tas a grossi de 100 % depuis le dernier cycle. Plus haut = moins de GC mais plus de mémoire. `off` désactive. |
| `GOMEMLIMIT` (Go 1.19+) | limite **souple** de mémoire : le GC travaille plus quand on s'en approche. Idéal en conteneur : `GOMEMLIMIT=900MiB` pour une limite de 1 Go. |

```go
var m runtime.MemStats
runtime.ReadMemStats(&m)
fmt.Printf("tas : %d Mo, cycles de GC : %d\n", m.HeapAlloc/1024/1024, m.NumGC)
```

Moins vous allouez, moins le GC a de travail : c'est le levier principal.

## Réduire les allocations {#allocations}

### Préallouer slices et maps

```go
// ❌ append réalloue plusieurs fois
var ids []int
for _, u := range users {
	ids = append(ids, u.ID)
}

// ✅ une seule allocation
ids := make([]int, 0, len(users))
for _, u := range users {
	ids = append(ids, u.ID)
}

index := make(map[int]*User, len(users)) // capacité indicative
```

### Construire des chaînes efficacement

`s += x` dans une boucle alloue une nouvelle chaîne à chaque tour. Utilisez `strings.Builder` (voir [[faq-concat-rapide]]).

### Réutiliser les tampons

```go
buf := make([]byte, 32*1024)
for {
	n, err := r.Read(buf) // le même tampon à chaque lecture
	// …
}
```

`sync.Pool` recycle des objets temporaires entre goroutines (voir [[sync#pool]]).

### Éviter les conversions inutiles

```go
// Chaque string(b) ou []byte(s) peut allouer une copie
if string(b) == "ok" {
} // le compilateur optimise ce cas précis (pas de copie)

bytes.Equal(b, []byte("ok")) // ou travaillez directement en []byte
```

### Valeurs plutôt que pointeurs pour les petites structs

Une petite struct passée par valeur reste souvent sur la pile ; un pointeur peut forcer l'échappement sur le tas. Les pointeurs ne sont pas automatiquement « plus rapides ».

## Mesurer : benchmarks {#benchmarks}

```go
func BenchmarkTraiter(b *testing.B) {
	donnees := genererDonnees(1000)
	b.ReportAllocs()
	for b.Loop() {
		Traiter(donnees)
	}
}
```

```bash
go test -bench=Traiter -benchmem -count=10 > avant.txt
# … optimisation …
go test -bench=Traiter -benchmem -count=10 > apres.txt
benchstat avant.txt apres.txt
```

Voir [[tests#benchmarks]].

## Profiler avec pprof {#pprof}

`pprof` montre **où** le programme passe son temps et alloue sa mémoire.

```bash
# Depuis les benchmarks
go test -bench=. -cpuprofile=cpu.out -memprofile=mem.out
go tool pprof -http=:8080 cpu.out   # interface web avec graphe et flame graph
```

Pour un serveur en cours d'exécution :

```go
import _ "net/http/pprof" // ajoute les routes /debug/pprof/

go func() {
	log.Println(http.ListenAndServe("localhost:6060", nil))
}()
```

```bash
go tool pprof -http=:8080 http://localhost:6060/debug/pprof/profile?seconds=30
go tool pprof http://localhost:6060/debug/pprof/heap
curl http://localhost:6060/debug/pprof/goroutine?debug=1   # où sont bloquées les goroutines
```

Le **traceur d'exécution** (`go tool trace`) visualise l'activité des goroutines, du GC et de l'ordonnanceur dans le temps.

## Les « fuites » de mémoire {#fuites}

Le GC libère tout ce qui n'est plus **référencé**. Une fuite en Go, c'est donc une référence conservée par erreur :

- des **goroutines bloquées** pour toujours (et tout ce qu'elles référencent) ;
- une **map** utilisée comme cache qui ne fait que grossir ;
- une petite **sous-slice** qui garde vivant un énorme tableau sous-jacent (copiez avec `slices.Clone`) ;
- un `time.Ticker` jamais arrêté.

Surveillez `runtime.NumGoroutine()` et le profil `heap` dans la durée.

## Règles d'or {#regles}

1. **Écrivez du code clair d'abord.** La plupart du code n'a pas besoin d'être optimisé.
2. **Mesurez**, ne devinez pas : l'intuition sur les performances est souvent fausse.
3. Optimisez l'**algorithme** avant les micro-détails (un `O(n²)` reste lent même optimisé).
4. Réduisez les **allocations** dans les chemins chauds.
5. Vérifiez le gain avec `benchstat` sur plusieurs exécutions.
