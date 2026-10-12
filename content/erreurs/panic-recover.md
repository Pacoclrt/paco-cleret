---
title: panic et recover
category: erreurs
order: 2
level: intermédiaire
summary: panic interrompt brutalement l'exécution, exécute les defer puis arrête le programme avec une trace. recover, appelé dans un defer, permet de rattraper un panic. Réservés aux situations anormales, pas à la gestion d'erreurs courante.
aliases: panic, panique, recover, crash, plantage, stack trace, trace d'appels, index out of range, nil pointer dereference, runtime error, must, mustcompile, rattraper une erreur, exception, fatal error
related: erreurs, defer, goroutines, faq-deadlock
questions:
  - Qu'est-ce qu'un panic en Go ?
  - Comment rattraper un panic avec recover ? -> recover
  - Quand utiliser panic plutôt qu'une erreur ? -> quand-panic
  - Quelles erreurs provoquent un panic automatiquement ? -> panics-runtime
  - Un panic dans une goroutine arrête-t-il tout le programme ? -> goroutines
---

@@ rapide

```go
func main() {
	defer fmt.Println("exécuté même en cas de panic")

	s := []int{1, 2, 3}
	fmt.Println(s[5]) // panic: runtime error: index out of range [5] with length 3
}
```

```go
// recover, dans un defer, intercepte le panic et le transforme en erreur
func Securise(f func()) (err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("panic rattrapé : %v", r)
		}
	}()
	f()
	return nil
}
```

- Un **panic** arrête la fonction, **exécute les `defer`**, remonte la pile d'appels, puis termine le programme avec une trace.
- **`recover()`** ne fonctionne **que dans une fonction différée**.
- Utilisez **des erreurs** pour les cas prévisibles ; `panic` pour les bugs et les états impossibles.

@@ detail

## Ce qui se passe lors d'un panic {#deroulement}

1. L'exécution normale de la fonction s'arrête immédiatement.
2. Ses fonctions différées (`defer`) s'exécutent.
3. Le panic remonte à la fonction appelante, qui exécute à son tour ses `defer`, et ainsi de suite.
4. Arrivé en haut de la pile de la goroutine sans avoir été rattrapé, le programme **s'arrête** avec un code de sortie 2 et affiche la valeur du panic et la **trace d'appels** :

```text
panic: runtime error: index out of range [5] with length 3

goroutine 1 [running]:
main.main()
	/home/paco/app/main.go:9 +0x1d
exit status 2
```

La trace indique le **fichier et la ligne** exacts : lisez-la de haut en bas, la première ligne de votre code est généralement la coupable.

## Les panics du runtime {#panics-runtime}

Certaines erreurs de programmation déclenchent automatiquement un panic :

| Situation | Message |
|---|---|
| Indice hors limites | `index out of range [5] with length 3` |
| Déréférencer un pointeur nil | `invalid memory address or nil pointer dereference` |
| Écrire dans une map nil | `assignment to entry in nil map` |
| Assertion de type ratée (sans `ok`) | `interface conversion: interface {} is string, not int` |
| Division entière par zéro | `integer divide by zero` |
| Fermer un channel déjà fermé ou nil | `close of closed channel` / `close of nil channel` |
| Envoyer sur un channel fermé | `send on closed channel` |
| Découpage invalide | `slice bounds out of range [:5] with capacity 3` |

Certaines situations ne sont **pas** des panics mais des **erreurs fatales**, impossibles à rattraper avec `recover` : `fatal error: all goroutines are asleep - deadlock!`, `concurrent map writes`, dépassement de pile. Voir [[faq-deadlock]].

## Déclencher un panic {#declencher}

```go
func Racine(x float64) float64 {
	if x < 0 {
		panic(fmt.Sprintf("Racine : argument négatif %v", x))
	}
	return math.Sqrt(x)
}
```

`panic` accepte n'importe quelle valeur (`any`) ; une `string` ou une `error` sont les plus courantes.

## Rattraper avec recover {#recover}

`recover()` arrête la remontée du panic et renvoie la valeur passée à `panic`. Il ne fonctionne **que s'il est appelé directement dans une fonction différée** ; ailleurs, il renvoie `nil` sans effet.

```go
func DiviserSur(a, b int) (res int, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("division impossible : %v", r)
		}
	}()
	return a / b, nil
}

fmt.Println(DiviserSur(10, 2)) // 5 <nil>
fmt.Println(DiviserSur(1, 0))  // 0 division impossible : runtime error: integer divide by zero
```

Après un `recover`, la fonction **se termine normalement** et renvoie ses résultats nommés (d'où l'usage de `err` nommé, modifié dans le `defer`).

## Quand utiliser panic ? {#quand-panic}

✅ **Oui** :

- pour signaler un **bug** : un état qui ne devrait jamais arriver (`default` d'un switch exhaustif, invariant violé) ;
- pour une **initialisation impossible** au démarrage (configuration obligatoire absente, regex invalide écrite en dur) ;
- dans les fonctions **`Must…`**, qui transforment une erreur en panic pour des valeurs connues à l'avance :

```go
var reEmail = regexp.MustCompile(`^[^@\s]+@[^@\s]+$`) // panic si la regex est invalide
var tmpl = template.Must(template.ParseFiles("page.html"))
```

❌ **Non** :

- pour une erreur **prévisible** : fichier absent, saisie invalide, réseau indisponible → renvoyez une `error` ;
- comme mécanisme de contrôle de flux (simuler un `try`/`catch`) ;
- dans une bibliothèque, pour des erreurs que l'appelant pourrait gérer.

:::tip Règle simple
Si l'appelant peut raisonnablement réagir à la situation, renvoyez une erreur. Si c'est un bug à corriger dans le code, un panic est acceptable.
:::

## Panics et goroutines {#goroutines}

Un panic non rattrapé dans **n'importe quelle goroutine** arrête **tout le programme**, pas seulement la goroutine. Et une goroutine ne peut pas rattraper le panic d'une autre : chaque goroutine qui risque de paniquer doit avoir son propre `recover`.

```go
func lancerSurement(f func()) {
	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("goroutine en panic : %v\n%s", r, debug.Stack())
			}
		}()
		f()
	}()
}
```

Le serveur `net/http` fait exactement cela : un panic dans un handler est rattrapé et loggué, et seule la requête concernée échoue.

## Relancer un panic {#relancer}

Si vous rattrapez un panic que vous ne savez pas gérer, relancez-le :

```go
defer func() {
	if r := recover(); r != nil {
		nettoyer()
		panic(r) // on laisse remonter
	}
}()
```

## os.Exit et log.Fatal {#exit}

Pour arrêter le programme **proprement** sur une erreur dans `main`, on utilise plutôt `log.Fatal(err)` (affiche puis `os.Exit(1)`) ou `os.Exit(code)`. Attention : contrairement à `panic`, ils **n'exécutent pas les `defer`**.
