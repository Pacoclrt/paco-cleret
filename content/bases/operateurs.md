---
title: Opérateurs
category: bases
order: 6
level: débutant
summary: Opérateurs arithmétiques (+ - * / %), de comparaison, logiques (&& || !), binaires (& | ^ &^ << >>), d'adresse (& *) et de channel (<-). Pas d'opérateur ternaire.
aliases: opérateur, opérateurs, operateur, modulo, %, division, division entière, reste, incrément, ++, --, comparaison, égalité, ==, !=, et logique, ou logique, &&, ||, bit, binaire, décalage, shift, xor, priorité, précédence, ternaire
related: types-de-base, if, pointeurs, channels
questions:
  - Quels sont les opérateurs en Go ?
  - Comment faire une division entière et obtenir le reste (modulo) ? -> arithmetiques
  - Pourquoi i++ ne peut pas être utilisé dans une expression ? -> increment
  - Y a-t-il un opérateur ternaire en Go ? -> ternaire
  - Comment fonctionnent les opérateurs binaires (bit à bit) ? -> binaires
  - Quelle est la priorité des opérateurs ? -> priorite
---

@@ rapide

| Catégorie | Opérateurs |
|---|---|
| Arithmétiques | `+` `-` `*` `/` `%` |
| Comparaison | `==` `!=` `<` `<=` `>` `>=` |
| Logiques | `&&` `||` `!` |
| Binaires | `&` `|` `^` `&^` `<<` `>>` |
| Affectation | `=` `:=` `+=` `-=` `*=` `/=` `%=` … |
| Incrément | `x++` `x--` (instructions seulement) |
| Pointeurs | `&x` (adresse) `*p` (valeur pointée) |
| Channels | `ch <- v` (envoi) `<-ch` (réception) |

```go
fmt.Println(7 / 2)   // 3   : division ENTIÈRE entre deux int
fmt.Println(7 % 2)   // 1   : reste
fmt.Println(7.0 / 2) // 3.5 : division flottante
```

Il n'y a **pas d'opérateur ternaire** (`a ? b : c`) : on écrit un `if`.

@@ detail

## Opérateurs arithmétiques {#arithmetiques}

```go
a, b := 17, 5
fmt.Println(a + b) // 22
fmt.Println(a - b) // 12
fmt.Println(a * b) // 85
fmt.Println(a / b) // 3   (division entière, tronquée vers zéro)
fmt.Println(a % b) // 2   (reste)

fmt.Println(-17 / 5) // -3  (tronquée vers zéro, pas vers -∞)
fmt.Println(-17 % 5) // -2  (le reste a le signe du dividende)
```

- Entre deux **entiers**, `/` est une division **entière**. Pour un résultat décimal, convertissez : `float64(a) / float64(b)`.
- `%` n'existe que pour les entiers. Pour les flottants : `math.Mod`.
- Diviser un entier par **zéro** provoque un `panic` à l'exécution (ou une erreur de compilation si c'est une constante).
- `+` concatène aussi les chaînes : `"Go" + "pher"`.

:::tip Tester la parité
`n%2 == 0` teste si `n` est pair. Attention : pour un nombre négatif impair, `n%2` vaut `-1`, donc testez `n%2 != 0` plutôt que `n%2 == 1`.
:::

## Incrément et décrément {#increment}

```go
i := 0
i++ // i = 1
i-- // i = 0
```

En Go, `i++` est une **instruction**, pas une expression. Donc :

```go
j := i++     // ❌ syntax error
++i          // ❌ pas de pré-incrément
arr[i++] = 1 // ❌
```

Ce choix évite les ambiguïtés célèbres du C (`a[i++] = i++`…).

## Comparaison {#comparaison}

Les opérateurs `==` et `!=` fonctionnent sur les types **comparables** : nombres, chaînes, booléens, pointeurs, channels, interfaces, et les structs et arrays dont tous les éléments sont comparables. Les slices, maps et fonctions ne se comparent qu'à `nil`.

```go
"abc" == "abc"                   // true
[2]int{1, 2} == [2]int{1, 2}     // true (arrays)
[]int{1} == []int{1}             // ❌ slice can only be compared to nil
slices.Equal([]int{1}, []int{1}) // ✅ true
```

Les deux opérandes doivent avoir **le même type** : `int(1) == int64(1)` ne compile pas.

## Opérateurs logiques {#logiques}

```go
age, membre := 20, false
if age >= 18 && !membre {
	fmt.Println("majeur non membre")
}
```

`&&` et `||` sont **court-circuités** : la partie droite n'est évaluée que si nécessaire. On en profite pour protéger un accès :

```go
if p != nil && p.Actif { // p.Actif n'est jamais lu si p est nil
}
if len(s) > 0 && s[0] == '#' {
}
```

## Opérateurs binaires (bit à bit) {#binaires}

| Opérateur | Nom | Exemple (`a=0b1100`, `b=0b1010`) |
|---|---|---|
| `&` | ET | `a & b` = `0b1000` |
| `|` | OU | `a | b` = `0b1110` |
| `^` | OU exclusif (XOR) | `a ^ b` = `0b0110` |
| `&^` | ET NON (*bit clear*) | `a &^ b` = `0b0100` |
| `^x` | NON (unaire) | inverse tous les bits |
| `<<` | décalage à gauche | `1 << 3` = `8` |
| `>>` | décalage à droite | `16 >> 2` = `4` |

```go
x := 0b1011
fmt.Printf("%04b\n", x&0b0010)  // 0010 : le bit 1 est allumé
fmt.Printf("%04b\n", x|0b0100)  // 1111 : allume le bit 2
fmt.Printf("%04b\n", x&^0b0001) // 1010 : éteint le bit 0
fmt.Println(1 << 10)            // 1024
```

`x << n` revient à multiplier par 2ⁿ, `x >> n` à diviser par 2ⁿ (pour un entier positif). Voir les drapeaux binaires dans [[constantes#bit-flags|Constantes et iota]].

## Affectation composée {#affectation}

```go
x := 10
x += 5  // 15
x -= 3  // 12
x *= 2  // 24
x /= 4  // 6
x %= 4  // 2
x <<= 3 // 16
s := "Go"
s += "pher" // "Gopher"
```

## Adresse et indirection {#pointeurs}

```go
n := 42
p := &n         // p contient l'adresse de n (type *int)
fmt.Println(*p) // 42 : valeur pointée
*p = 100        // modifie n
```

Voir [[pointeurs]].

## Opérateur de channel {#channel}

```go
ch := make(chan int, 1)
ch <- 5   // envoi
v := <-ch // réception
```

Voir [[channels]].

## Priorité des opérateurs {#priorite}

Go n'a que **5 niveaux** de priorité pour les opérateurs binaires (du plus fort au plus faible) :

| Priorité | Opérateurs |
|---|---|
| 5 | `*` `/` `%` `<<` `>>` `&` `&^` |
| 4 | `+` `-` `|` `^` |
| 3 | `==` `!=` `<` `<=` `>` `>=` |
| 2 | `&&` |
| 1 | `||` |

Les opérateurs de même niveau s'évaluent de gauche à droite. Dans le doute, **ajoutez des parenthèses** : `gofmt` les conservera et le code sera plus clair.

```go
fmt.Println(2 + 3*4)     // 14
fmt.Println((2 + 3) * 4) // 20
```

## Pas d'opérateur ternaire {#ternaire}

Les concepteurs de Go ont jugé que `cond ? a : b` menait trop souvent à du code illisible. On écrit :

```go
statut := "mineur"
if age >= 18 {
	statut = "majeur"
}
```

Pour des cas simples avec des nombres, les fonctions intégrées `min` et `max` (Go 1.21+) remplacent souvent un ternaire : `plafond := min(valeur, 100)`.
