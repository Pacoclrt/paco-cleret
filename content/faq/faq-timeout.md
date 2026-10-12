---
title: Comment ajouter un timeout à une opération ?
category: faq
order: 18
level: intermédiaire
summary: Le plus idiomatique : context.WithTimeout, passé à la fonction qui doit s'arrêter. Pour un simple channel, select avec time.After. Pour le client HTTP, le champ Timeout de http.Client.
aliases: timeout, délai, délai d'expiration, time out, expiration, deadline, limiter le temps, annuler après, opération trop longue, context.withtimeout, time.after, http timeout, requête trop longue
related: context, select, time, http
questions:
  - Comment limiter la durée d'une opération en Go ?
  - Comment mettre un timeout sur une requête HTTP ? -> http
  - Comment mettre un timeout sur une lecture de channel ? -> channel
  - Comment rendre ma propre fonction annulable ? -> fonction-annulable
---

@@ rapide

```go
// 1. Avec context : la méthode standard
ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
defer cancel()

resultat, err := operation(ctx) // la fonction doit accepter et respecter ctx
if errors.Is(err, context.DeadlineExceeded) {
	fmt.Println("trop long !")
}

// 2. Sur un channel : select + time.After
select {
case v := <-resultats:
	fmt.Println(v)
case <-time.After(3 * time.Second):
	fmt.Println("timeout")
}

// 3. Client HTTP
client := &http.Client{Timeout: 10 * time.Second}
```

@@ detail

## Avec un contexte {#context}

`context.WithTimeout` crée un contexte qui sera **annulé automatiquement** après la durée. Toutes les fonctions qui reçoivent ce contexte (requêtes HTTP, SQL, vos propres fonctions) s'arrêtent alors :

```go
func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel() // libère les ressources, même si l'opération finit avant

	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, "https://exemple.com/lent", nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			log.Fatal("le serveur n'a pas répondu à temps")
		}
		log.Fatal(err)
	}
	defer resp.Body.Close()
}
```

Avantage majeur : le délai **se propage**. Si votre fonction appelle trois autres fonctions, elles partagent la même échéance globale.

## Rendre sa propre fonction annulable {#fonction-annulable}

Une fonction qui fait un long travail doit surveiller `ctx.Done()` :

```go
func calculLong(ctx context.Context, donnees []int) (int, error) {
	total := 0
	for i, d := range donnees {
		if i%1000 == 0 { // vérifier régulièrement, pas à chaque tour
			if err := ctx.Err(); err != nil {
				return 0, err // context.DeadlineExceeded ou context.Canceled
			}
		}
		total += traiter(d)
	}
	return total, nil
}
```

Pour une fonction **bloquante** qui ne connaît pas le contexte, on l'exécute dans une goroutine et on attend avec `select` :

```go
func avecTimeout(ctx context.Context, f func() (string, error)) (string, error) {
	type res struct {
		v   string
		err error
	}
	ch := make(chan res, 1) // tampon de 1 : la goroutine ne restera pas bloquée
	go func() {
		v, err := f()
		ch <- res{v, err}
	}()

	select {
	case r := <-ch:
		return r.v, r.err
	case <-ctx.Done():
		return "", ctx.Err()
	}
}
```

:::warning La goroutine continue
Dans ce dernier cas, `f` continue de s'exécuter en arrière-plan après le timeout (on ne peut pas tuer une goroutine de l'extérieur). On a seulement arrêté de l'attendre. Seules les fonctions qui acceptent un `ctx` peuvent vraiment s'interrompre.
:::

## Sur un channel {#channel}

```go
select {
case msg := <-messages:
	fmt.Println("reçu :", msg)
case <-time.After(5 * time.Second):
	fmt.Println("aucun message depuis 5 s")
}
```

Dans une boucle, créez le timer **une seule fois** si le délai est global, ou utilisez `time.NewTimer` avec `Reset` pour un délai d'inactivité.

## HTTP {#http}

Côté **client** :

```go
client := &http.Client{
	Timeout: 10 * time.Second, // délai total : connexion + envoi + lecture de la réponse
}
```

Côté **serveur** :

```go
srv := &http.Server{
	Addr:              ":8080",
	ReadHeaderTimeout: 5 * time.Second,
	ReadTimeout:       10 * time.Second,
	WriteTimeout:      30 * time.Second,
	IdleTimeout:       2 * time.Minute,
}
```

Et pour limiter le temps d'un **handler** précis : `http.TimeoutHandler(handler, 2*time.Second, "délai dépassé")`.

## Autres contextes {#autres}

| Opération | Méthode |
|---|---|
| Base de données | `db.QueryContext(ctx, …)` |
| Connexion réseau | `net.DialTimeout("tcp", addr, 5*time.Second)` ou `conn.SetDeadline(…)` |
| Commande externe | `exec.CommandContext(ctx, "programme")` |
| Toutes les goroutines d'un groupe | `errgroup.WithContext(ctx)` |

Voir [[context]] et [[select#timeout]].
