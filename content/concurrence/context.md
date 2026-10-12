---
title: context
category: concurrence
order: 5
level: avancé
summary: Un context.Context transporte un signal d'annulation, une échéance (deadline) et des valeurs liées à une requête, à travers les appels de fonctions et les goroutines. Il se passe toujours en premier paramètre, nommé ctx.
aliases: context, contexte, ctx, context.context, annulation, annuler, cancel, withcancel, withtimeout, withdeadline, withvalue, deadline, échéance, timeout, délai, ctx.done, ctx.err, context.background, context.todo, propagation, requête
related: goroutines, select, http, faq-timeout, patterns-concurrence
questions:
  - À quoi sert le package context ?
  - Comment annuler une goroutine avec context ? -> withcancel
  - Comment mettre un timeout avec context ? -> withtimeout
  - Comment passer une valeur dans un context ? -> withvalue
  - Pourquoi faut-il toujours appeler cancel ? -> cancel
  - Quelle différence entre context.Background et context.TODO ? -> racine
---

@@ rapide

```go
func Telecharger(ctx context.Context, url string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	resp, err := http.DefaultClient.Do(req) // s'arrête si ctx est annulé
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel() // toujours libérer

	data, err := Telecharger(ctx, "https://go.dev")
	if errors.Is(err, context.DeadlineExceeded) {
		fmt.Println("trop long !")
	}
	_ = data
}
```

- `ctx` est **le premier paramètre** des fonctions qui font des E/S ou du travail long.
- `ctx.Done()` est un channel **fermé** quand le contexte est annulé ou expiré ; `ctx.Err()` donne la raison.
- L'annulation se **propage** à tous les contextes dérivés.

@@ detail

## Le problème résolu {#probleme}

Un serveur reçoit une requête, qui déclenche une requête SQL et deux appels à d'autres API, chacun dans sa goroutine. Le client ferme son navigateur. Sans mécanisme commun, tout ce travail continue pour rien.

`context` donne à toute cette chaîne d'appels un **signal d'arrêt partagé** et une **échéance commune**.

## L'interface Context {#interface}

```go
type Context interface {
	Deadline() (deadline time.Time, ok bool) // échéance éventuelle
	Done() <-chan struct{}                   // fermé à l'annulation
	Err() error                              // nil, Canceled ou DeadlineExceeded
	Value(key any) any                       // valeur associée à une clé
}
```

Un contexte est **immuable** : on ne le modifie pas, on en **dérive** un nouveau (enfant). Annuler un parent annule tous ses enfants, jamais l'inverse.

## Les contextes racines {#racine}

- `context.Background()` : le contexte racine, vide, jamais annulé. On le crée dans `main`, dans les tests ou à l'initialisation.
- `context.TODO()` : identique, mais signale « je ne sais pas encore quel contexte utiliser ici » (pour un code en cours de migration).

Dans un serveur HTTP, on part de `r.Context()`, annulé automatiquement si le client se déconnecte.

## WithCancel : annulation manuelle {#withcancel}

```go
func producteur(ctx context.Context, sortie chan<- int) {
	for i := 0; ; i++ {
		select {
		case <-ctx.Done():
			fmt.Println("arrêt du producteur :", ctx.Err())
			return
		case sortie <- i:
			time.Sleep(100 * time.Millisecond)
		}
	}
}

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	nombres := make(chan int)
	go producteur(ctx, nombres)

	for n := range nombres {
		fmt.Println(n)
		if n == 4 {
			cancel() // demande l'arrêt de la goroutine
			break
		}
	}
	time.Sleep(200 * time.Millisecond) // laisse le temps d'afficher le message d'arrêt
}
```

Une goroutine qui accepte un `ctx` doit **régulièrement** vérifier `ctx.Done()`, en général dans un `select`.

## WithTimeout et WithDeadline {#withtimeout}

```go
ctx, cancel := context.WithTimeout(ctx, 500*time.Millisecond) // durée
defer cancel()

ctx2, cancel2 := context.WithDeadline(ctx, time.Now().Add(time.Minute)) // heure précise
defer cancel2()
```

Le contexte est annulé automatiquement à l'échéance, avec `ctx.Err() == context.DeadlineExceeded`. Si le parent a une échéance plus proche, c'est elle qui s'applique.

```go
func requeteLente(ctx context.Context) error {
	select {
	case <-time.After(3 * time.Second): // simule un travail de 3 s
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

ctx, cancel := context.WithTimeout(context.Background(), time.Second)
defer cancel()
fmt.Println(requeteLente(ctx)) // context deadline exceeded (après 1 s)
```

## Toujours appeler cancel {#cancel}

Les fonctions `With…` renvoient une fonction `cancel`. Il faut **toujours** l'appeler, en général avec `defer`, même si le contexte expire tout seul : sinon les ressources associées (timer, lien avec le parent) restent allouées jusqu'à l'expiration du parent. `go vet` signale les `cancel` oubliés.

## Les erreurs d'un contexte {#erreurs}

| `ctx.Err()` | Signification |
|---|---|
| `nil` | contexte toujours actif |
| `context.Canceled` | `cancel()` a été appelé |
| `context.DeadlineExceeded` | l'échéance est dépassée |

Testez-les avec `errors.Is`. Pour expliquer **pourquoi** on annule, `context.WithCancelCause` et `context.Cause(ctx)` (Go 1.20+) transportent une erreur personnalisée.

## WithValue : valeurs de requête {#withvalue}

Un contexte peut transporter des valeurs **liées à la requête** : identifiant de requête, utilisateur authentifié, informations de traçage.

```go
type cleContexte string // type privé pour éviter les collisions entre packages

const cleRequeteID cleContexte = "requeteID"

func AvecRequeteID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, cleRequeteID, id)
}

func RequeteID(ctx context.Context) string {
	id, _ := ctx.Value(cleRequeteID).(string)
	return id
}
```

:::warning Pas un sac à paramètres
N'utilisez **pas** `WithValue` pour passer des paramètres optionnels, une connexion à la base ou une configuration : ces dépendances doivent être des paramètres explicites ou des champs de struct. Les valeurs de contexte sont invisibles dans les signatures et non typées.
:::

## Les règles d'or {#regles}

1. `ctx context.Context` est le **premier paramètre** : `func Faire(ctx context.Context, …)`.
2. Ne **stockez pas** de contexte dans une struct ; passez-le à chaque appel.
3. Ne passez jamais un contexte `nil` : utilisez `context.TODO()`.
4. Appelez **toujours** `cancel` (avec `defer`).
5. Un contexte peut être utilisé par plusieurs goroutines en même temps sans risque.

## Dans un serveur HTTP {#http}

```go
func handler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context() // annulé si le client se déconnecte

	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	res, err := db.QueryContext(ctx, "SELECT …") // la requête SQL s'arrête aussi
	if err != nil {
		http.Error(w, "indisponible", http.StatusServiceUnavailable)
		return
	}
	defer res.Close()
	// …
}
```

Les fonctions de la bibliothèque standard qui acceptent un contexte ont souvent le suffixe `Context` : `QueryContext`, `NewRequestWithContext`, `DialContext`, `ExecContext`.

## Arrêt propre sur Ctrl+C {#signal}

```go
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()

<-ctx.Done() // attend Ctrl+C ou SIGTERM
fmt.Println("arrêt en cours…")
```

Voir [[patterns-concurrence#arret-propre]].
