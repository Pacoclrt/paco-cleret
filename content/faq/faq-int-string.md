---
title: Comment convertir un int en string (et inversement) ?
category: faq
order: 2
level: débutant
summary: strconv.Itoa(42) donne "42", strconv.Atoi("42") donne 42 et une erreur à vérifier. Ne jamais utiliser string(42), qui donne le caractère de code 42.
aliases: int en string, int to string, string en int, string to int, convertir un nombre en texte, convertir du texte en nombre, itoa, atoi, parseint, string(int), nombre en chaîne, chaîne en nombre, float en string
related: conversions, string, fmt
questions:
  - Comment convertir un int en string en Go ?
  - Comment convertir une string en int en Go ?
  - Pourquoi string(65) donne "A" ? -> piege
  - Comment convertir un float en string ? -> autres-types
---

@@ rapide

```go
import "strconv"

// int → string
s := strconv.Itoa(42)        // "42"

// string → int (peut échouer)
n, err := strconv.Atoi("42") // 42, nil
if err != nil {
	fmt.Println("ce n'est pas un nombre :", err)
}
```

:::danger À ne jamais faire
`string(42)` donne `"*"` (le caractère Unicode numéro 42), pas `"42"` !
:::

@@ detail

## Le piège de string(n) {#piege}

```go
n := 65
fmt.Println(string(n))       // "A"  : caractère U+0041
fmt.Println(strconv.Itoa(n)) // "65" ✅
```

La conversion `string(entier)` interprète l'entier comme un **point de code Unicode**. `go vet` le signale : *conversion from int to string yields a string of one rune, not a string of digits*.

## int vers string {#int-vers-string}

| Méthode | Exemple | Remarque |
|---|---|---|
| `strconv.Itoa(n)` | `"42"` | la plus courante, pour un `int` |
| `strconv.FormatInt(int64(n), 10)` | `"42"` | pour un `int64`, ou une autre base |
| `strconv.FormatInt(255, 16)` | `"ff"` | hexadécimal |
| `strconv.FormatInt(5, 2)` | `"101"` | binaire |
| `fmt.Sprint(n)` | `"42"` | marche avec tout, plus lent |
| `fmt.Sprintf("%03d", 7)` | `"007"` | avec mise en forme |

## string vers int {#string-vers-int}

```go
n, err := strconv.Atoi("123")
if err != nil {
	// "abc", "", "12.5", " 12" (espace !) provoquent une erreur
	return fmt.Errorf("nombre invalide : %w", err)
}
```

Pour plus de contrôle :

```go
v, err := strconv.ParseInt("-9000", 10, 64) // base 10, résultat int64
u, err := strconv.ParseUint("ff", 16, 8)    // base 16, doit tenir sur 8 bits → 255
b, err := strconv.ParseInt("0x1F", 0, 64)   // base 0 : déduite du préfixe → 31
```

Une erreur de type `*strconv.NumError` précise le problème (`invalid syntax` ou `value out of range`) :

```go
_, err := strconv.Atoi("99999999999999999999")
fmt.Println(err) // strconv.Atoi: parsing "99999999999999999999": value out of range
```

:::tip Nettoyez l'entrée
Les données venant d'un fichier ou du clavier contiennent souvent des espaces ou un `\n`. Appelez `strings.TrimSpace` avant `Atoi`.
:::

## Autres types {#autres-types}

```go
// float ↔ string
s := strconv.FormatFloat(3.14159, 'f', 2, 64) // "3.14"
s2 := fmt.Sprintf("%.2f", 3.14159)            // "3.14"
f, err := strconv.ParseFloat("3.14", 64)

// bool ↔ string
strconv.FormatBool(true)         // "true"
b, err := strconv.ParseBool("1") // true (accepte 1, t, T, TRUE, true, True…)

// rune ↔ string
string('é')    // "é"
[]rune("é")[0] // 'é'

// chiffre unique : rune ↔ int
int('7' - '0') // 7
rune('0' + 3)  // '3'
```

## Convertir plusieurs nombres {#plusieurs}

```go
// "1,2,3" → []int
func ParseListe(s string) ([]int, error) {
	var res []int
	for part := range strings.SplitSeq(s, ",") {
		n, err := strconv.Atoi(strings.TrimSpace(part))
		if err != nil {
			return nil, err
		}
		res = append(res, n)
	}
	return res, nil
}

// []int → "1,2,3"
func JoinInts(nums []int) string {
	parts := make([]string, len(nums))
	for i, n := range nums {
		parts[i] = strconv.Itoa(n)
	}
	return strings.Join(parts, ",")
}
```

Toutes les conversions sont détaillées dans [[conversions]].
