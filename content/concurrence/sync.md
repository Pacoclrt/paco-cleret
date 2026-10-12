---
title: Le package sync (WaitGroup, Mutex…)
category: concurrence
order: 4
level: intermédiaire
summary: sync fournit les outils de synchronisation : WaitGroup pour attendre des goroutines, Mutex et RWMutex pour protéger des données partagées, Once pour une initialisation unique. sync/atomic offre des compteurs sans verrou.
aliases: sync, waitgroup, wait group, wg, mutex, verrou, lock, unlock, rwmutex, rlock, once, sync.once, oncefunc, oncevalue, atomic, sync/atomic, compteur atomique, atomic.int64, sync.map, pool, sync.pool, cond, section critique, exclusion mutuelle
related: goroutines, channels, faq-data-race, faq-attendre-goroutines, patterns-concurrence, maps
questions:
  - Comment attendre la fin de plusieurs goroutines avec WaitGroup ? -> waitgroup
  - Comment utiliser un Mutex pour protéger une variable ? -> mutex
  - Quelle différence entre Mutex et RWMutex ? -> rwmutex
  - Comment exécuter du code une seule fois (singleton) ? -> once
  - Comment faire un compteur partagé sans mutex ? -> atomic
  - Quand utiliser un mutex plutôt qu'un channel ? -> mutex-ou-channel
---

@@ rapide

```go
// Attendre des goroutines
var wg sync.WaitGroup
for _, url := range urls {
	wg.Add(1)
	go func() {
		defer wg.Done()
		telecharger(url)
	}()
}
wg.Wait()

// Protéger une donnée partagée
type Compteur struct {
	mu sync.Mutex
	n  map[string]int
}

func (c *Compteur) Inc(cle string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.n[cle]++
}
```

| Outil | Rôle |
|---|---|
| `sync.WaitGroup` | attendre qu'un groupe de goroutines ait fini |
| `sync.Mutex` | un seul accès à la fois à une section de code |
| `sync.RWMutex` | plusieurs lecteurs **ou** un seul écrivain |
| `sync.Once` | exécuter une initialisation une seule fois |
| `atomic.Int64`… | compteurs et drapeaux sans verrou |

@@ detail

## WaitGroup {#waitgroup}

Un `WaitGroup` est un compteur de tâches en cours :

- `wg.Add(n)` : n tâches de plus ;
- `wg.Done()` : une tâche terminée (équivaut à `Add(-1)`) ;
- `wg.Wait()` : bloque jusqu'à ce que le compteur revienne à 0.

```go
func main() {
	var wg sync.WaitGroup
	for i := 1; i <= 5; i++ {
		wg.Add(1) // AVANT le go, jamais dans la goroutine
		go func() {
			defer wg.Done() // defer : appelé même en cas de return anticipé
			fmt.Println("tâche", i)
		}()
	}
	wg.Wait()
	fmt.Println("toutes les tâches sont finies")
}
```

:::warning Trois erreurs classiques
1. Appeler `wg.Add(1)` **dans** la goroutine : `Wait` peut passer avant que `Add` soit exécuté.
2. Oublier `Done` (ou un `return` qui l'évite) : `Wait` bloque pour toujours. Utilisez `defer wg.Done()`.
3. **Copier** un WaitGroup (le passer par valeur à une fonction) : passez `*sync.WaitGroup`.
:::

Depuis **Go 1.25**, la méthode `wg.Go` fait `Add`, lance la goroutine et appelle `Done` pour vous :

```go
var wg sync.WaitGroup
for _, url := range urls {
	wg.Go(func() {
		telecharger(url)
	})
}
wg.Wait()
```

Pour récupérer des **erreurs** et annuler les autres tâches à la première erreur, voir `errgroup` dans [[patterns-concurrence#errgroup]].

## Mutex {#mutex}

Un **mutex** (*mutual exclusion*) garantit qu'une seule goroutine à la fois exécute la portion de code entre `Lock()` et `Unlock()` : la **section critique**.

```go
type Banque struct {
	mu     sync.Mutex
	soldes map[string]int
}

func (b *Banque) Virer(de, vers string, montant int) error {
	b.mu.Lock()
	defer b.mu.Unlock()

	if b.soldes[de] < montant {
		return errors.New("solde insuffisant")
	}
	b.soldes[de] -= montant
	b.soldes[vers] += montant
	return nil
}

func (b *Banque) Solde(compte string) int {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.soldes[compte]
}
```

Bonnes pratiques :

- Placez le mutex **juste au-dessus** des champs qu'il protège, et nommez-le `mu`.
- `defer mu.Unlock()` juste après `Lock()` : impossible d'oublier de déverrouiller.
- Gardez les sections critiques **courtes** : pas d'appel réseau ou d'E/S lente en tenant le verrou.
- **Toutes** les lectures et écritures de la donnée protégée doivent prendre le verrou, pas seulement les écritures.
- Un `sync.Mutex` ne doit **jamais être copié** après utilisation : utilisez des receivers pointeurs (`go vet` détecte les copies).
- Un mutex Go n'est **pas réentrant** : appeler `Lock()` deux fois dans la même goroutine bloque pour toujours.

## RWMutex {#rwmutex}

Quand une donnée est **beaucoup lue et rarement modifiée**, un `RWMutex` permet plusieurs lecteurs simultanés :

```go
type Cache struct {
	mu      sync.RWMutex
	donnees map[string]string
}

func (c *Cache) Get(cle string) (string, bool) {
	c.mu.RLock() // verrou de lecture partagé
	defer c.mu.RUnlock()
	v, ok := c.donnees[cle]
	return v, ok
}

func (c *Cache) Set(cle, valeur string) {
	c.mu.Lock() // verrou d'écriture exclusif
	defer c.mu.Unlock()
	c.donnees[cle] = valeur
}
```

Un `RWMutex` est un peu plus coûteux qu'un `Mutex` : il n'est intéressant que si les lectures dominent nettement. Dans le doute, commencez par un `Mutex`.

## Once {#once}

`sync.Once` garantit qu'une fonction n'est exécutée **qu'une seule fois**, même appelée depuis plusieurs goroutines en même temps. Idéal pour une initialisation paresseuse :

```go
var (
	configOnce sync.Once
	config     *Config
)

func GetConfig() *Config {
	configOnce.Do(func() {
		config = chargerConfig() // exécuté une seule fois
	})
	return config
}
```

Depuis Go 1.21, des variantes plus pratiques :

```go
var getConfig = sync.OnceValue(func() *Config {
	return chargerConfig()
})

cfg := getConfig() // chargé au premier appel, mis en cache ensuite

var lireCle = sync.OnceValues(func() ([]byte, error) {
	return os.ReadFile("cle.pem")
})
```

## Les opérations atomiques {#atomic}

Pour un simple compteur ou drapeau partagé, le package `sync/atomic` est plus léger qu'un mutex :

```go
var visites atomic.Int64

var wg sync.WaitGroup
for range 1000 {
	wg.Add(1)
	go func() {
		defer wg.Done()
		visites.Add(1)
	}()
}
wg.Wait()
fmt.Println(visites.Load()) // 1000, toujours

var pret atomic.Bool
pret.Store(true)
if pret.Load() {
}
```

Types disponibles : `atomic.Int32`, `Int64`, `Uint32`, `Uint64`, `Bool`, `Pointer[T]`, `Value`. Au-delà d'une seule variable (deux champs à modifier ensemble), utilisez un mutex.

## sync.Map {#sync-map}

`sync.Map` est une map utilisable par plusieurs goroutines sans verrou externe :

```go
var m sync.Map
m.Store("a", 1)
v, ok := m.Load("a")
m.Range(func(cle, valeur any) bool {
	fmt.Println(cle, valeur)
	return true // continuer
})
```

Elle n'est **pas typée** (clés et valeurs sont des `any`) et n'est optimisée que pour deux cas : clés écrites une fois puis beaucoup lues, ou goroutines travaillant sur des clés disjointes. Dans les autres cas, une `map` + `sync.Mutex` est plus simple et souvent plus rapide.

## sync.Pool {#pool}

`sync.Pool` recycle des objets temporaires pour réduire la pression sur le ramasse-miettes :

```go
var bufPool = sync.Pool{
	New: func() any { return new(bytes.Buffer) },
}

func formater(v any) string {
	buf := bufPool.Get().(*bytes.Buffer)
	defer func() {
		buf.Reset()
		bufPool.Put(buf)
	}()
	fmt.Fprintf(buf, "%v", v)
	return buf.String()
}
```

Réservé aux chemins très sollicités, après mesure (voir [[memoire-performance]]).

## Mutex ou channel ? {#mutex-ou-channel}

| Utilisez un **mutex** pour… | Utilisez un **channel** pour… |
|---|---|
| protéger l'**état** interne d'une struct (cache, compteur, map) | **transférer** la propriété d'une donnée |
| des sections critiques courtes | coordonner des étapes (pipeline, workers) |
| un accès simple et local | signaler des événements (fin, annulation) |

Les deux sont idiomatiques. Choisissez ce qui rend le code le plus **simple** à lire.
