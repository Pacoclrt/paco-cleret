---
title: defer
category: controle
order: 4
level: intermédiaire
summary: defer programme l'appel d'une fonction juste avant le retour de la fonction courante. Idéal pour libérer une ressource (fermer un fichier, déverrouiller un mutex). Les appels différés s'exécutent en ordre inverse (LIFO).
aliases: defer, différer, différé, close, fermer, nettoyage, cleanup, libérer, ressource, finally, lifo, ordre d'exécution, unlock
related: panic-recover, fichiers, sync, fonctions, erreurs
questions:
  - À quoi sert defer en Go ?
  - Dans quel ordre s'exécutent plusieurs defer ? -> ordre
  - Quand les arguments d'un defer sont-ils évalués ? -> evaluation-arguments
  - Pourquoi ne pas utiliser defer dans une boucle ? -> defer-boucle
  - Comment récupérer l'erreur d'un Close différé ? -> resultats-nommes
---

@@ rapide

```go
func lire(chemin string) error {
	f, err := os.Open(chemin)
	if err != nil {
		return err
	}
	defer f.Close() // sera appelé à la sortie de lire, quoi qu'il arrive

	// … utiliser f …
	return nil
}
```

- L'appel différé s'exécute **quand la fonction se termine** : `return` normal, fin du corps, ou `panic`.
- Plusieurs `defer` s'exécutent dans l'**ordre inverse** de leur déclaration (le dernier d'abord).
- Les **arguments** sont évalués **immédiatement**, au moment du `defer`.
- Usage typique : placer le `defer` **juste après** l'acquisition de la ressource.

@@ detail

## Pourquoi defer ? {#pourquoi}

Sans `defer`, il faut penser à libérer la ressource avant **chaque** `return` :

```go
func copier() error {
	src, err := os.Open("a.txt")
	if err != nil {
		return err
	}
	dst, err := os.Create("b.txt")
	if err != nil {
		src.Close() // à ne pas oublier…
		return err
	}
	if _, err := io.Copy(dst, src); err != nil {
		src.Close() // … ni ici…
		dst.Close()
		return err
	}
	src.Close() // … ni là.
	return dst.Close()
}
```

Avec `defer`, la libération est écrite **une seule fois**, juste à côté de l'acquisition :

```go
func copier() error {
	src, err := os.Open("a.txt")
	if err != nil {
		return err
	}
	defer src.Close()

	dst, err := os.Create("b.txt")
	if err != nil {
		return err
	}
	defer dst.Close()

	_, err = io.Copy(dst, src)
	return err
}
```

C'est l'équivalent du `finally` ou du `with`/`using` d'autres langages.

## Ordre d'exécution : LIFO {#ordre}

Les appels différés sont empilés : le **dernier** déclaré est exécuté en **premier** (*Last In, First Out*).

```go
func main() {
	defer fmt.Println("1")
	defer fmt.Println("2")
	defer fmt.Println("3")
	fmt.Println("corps")
}
```

```output
corps
3
2
1
```

C'est logique : les ressources sont libérées dans l'ordre inverse de leur acquisition (comme on referme des poupées russes).

## Évaluation immédiate des arguments {#evaluation-arguments}

La **fonction** est appelée plus tard, mais ses **arguments sont évalués tout de suite** :

```go
func main() {
	x := 1
	defer fmt.Println("defer :", x) // x vaut 1 à cet instant
	x = 2
	fmt.Println("fin :", x)
}

// fin : 2
// defer : 1
```

Pour lire la valeur **au moment de la sortie**, utilisez une fonction anonyme (closure) :

```go
defer func() {
	fmt.Println("defer :", x) // lit x à la sortie : 2
}()
```

Cas pratique : mesurer la durée d'une fonction.

```go
func traitement() {
	defer chrono("traitement")() // chrono est appelé maintenant, la fonction retournée à la fin
	time.Sleep(100 * time.Millisecond)
}

func chrono(nom string) func() {
	debut := time.Now()
	return func() {
		fmt.Printf("%s a pris %v\n", nom, time.Since(debut))
	}
}
```

## defer et les résultats nommés {#resultats-nommes}

Une fonction différée peut **lire et modifier** les résultats nommés de la fonction, après le `return`. Exemple : ne pas perdre l'erreur renvoyée par `Close` lors d'une écriture.

```go
func ecrire(chemin string, data []byte) (err error) {
	f, err := os.Create(chemin)
	if err != nil {
		return err
	}
	defer func() {
		if cerr := f.Close(); cerr != nil && err == nil {
			err = cerr // remonte l'erreur de fermeture
		}
	}()
	_, err = f.Write(data)
	return err
}
```

:::info Pourquoi c'est important pour l'écriture
Pour un fichier ouvert en écriture, `Close` peut échouer (disque plein, données non vidées). Ignorer son erreur peut faire croire que l'écriture a réussi. En lecture seule, un simple `defer f.Close()` suffit.
:::

## defer dans une boucle {#defer-boucle}

Les appels différés ne s'exécutent qu'à la fin de la **fonction**, pas à la fin de chaque tour de boucle :

```go
// ❌ Tous les fichiers restent ouverts jusqu'à la fin de la fonction
for _, nom := range fichiers {
	f, err := os.Open(nom)
	if err != nil {
		return err
	}
	defer f.Close()
	traiter(f)
}
```

Avec des milliers de fichiers, on dépasse la limite de fichiers ouverts du système. Solution : extraire le corps dans une fonction.

```go
// ✅ Chaque fichier est fermé à la fin de traiterFichier
for _, nom := range fichiers {
	if err := traiterFichier(nom); err != nil {
		return err
	}
}

func traiterFichier(nom string) error {
	f, err := os.Open(nom)
	if err != nil {
		return err
	}
	defer f.Close()
	return traiter(f)
}
```

## Usages courants {#usages}

```go
mu.Lock()
defer mu.Unlock() // déverrouiller un mutex

resp, err := http.Get(url)
if err != nil {
	return err
}
defer resp.Body.Close() // fermer le corps d'une réponse HTTP

ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel() // libérer les ressources du contexte

tx, _ := db.Begin()
defer tx.Rollback() // annuler si on n'a pas fait Commit

defer wg.Done() // signaler la fin d'une goroutine
```

## defer, panic et recover {#panic}

Les fonctions différées s'exécutent **même en cas de panic**. C'est le seul endroit où `recover()` peut intercepter un panic :

```go
defer func() {
	if r := recover(); r != nil {
		fmt.Println("panic rattrapé :", r)
	}
}()
```

Voir [[panic-recover]].

:::warning os.Exit ignore les defer
`os.Exit` (et donc `log.Fatal`) termine le programme **immédiatement**, sans exécuter les appels différés.
:::

## Coût {#cout}

Depuis Go 1.14, le coût de `defer` est quasiment nul dans la plupart des cas (*open-coded defers*). Il n'y a pas de raison de l'éviter pour des questions de performance.
