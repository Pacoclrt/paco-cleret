---
title: Comment concaténer beaucoup de chaînes efficacement ?
category: faq
order: 15
level: intermédiaire
summary: Dans une boucle, utilisez strings.Builder au lieu de += (qui recopie toute la chaîne à chaque tour). Pour une liste déjà prête, strings.Join. Pour quelques morceaux, + ou fmt.Sprintf suffisent.
aliases: concaténer, concaténation, concat, string builder, strings.builder, +=, performance string, assembler des chaînes, joindre des chaînes, join, bytes.buffer, sprintf lent
related: string, package-strings, memoire-performance, tests
questions:
  - Quelle est la façon la plus rapide de concaténer des strings en Go ?
  - Pourquoi += sur une string est lent dans une boucle ? -> pourquoi
  - Quelle différence entre strings.Builder et bytes.Buffer ? -> buffer
---

@@ rapide

```go
// ❌ Lent dans une boucle : nouvelle chaîne recopiée à chaque tour
s := ""
for i := range 10000 {
	s += strconv.Itoa(i)
}

// ✅ strings.Builder : un tampon qui grandit
var sb strings.Builder
for i := range 10000 {
	sb.WriteString(strconv.Itoa(i))
}
s = sb.String()

// ✅ strings.Join quand on a déjà une slice
s = strings.Join(morceaux, ", ")
```

| Situation | Choix |
|---|---|
| 2 ou 3 morceaux | `a + b + c` |
| avec mise en forme | `fmt.Sprintf` |
| une slice à assembler | `strings.Join` |
| dans une boucle | `strings.Builder` |

@@ detail

## Pourquoi += est lent dans une boucle {#pourquoi}

Les strings sont **immuables**. `s += x` ne peut pas agrandir `s` : il alloue une **nouvelle** chaîne de taille `len(s)+len(x)`, y recopie `s` puis `x`. Sur `n` tours, on recopie `1 + 2 + … + n` morceaux : coût **quadratique**.

| Nombre d'ajouts | `+=` (ordre de grandeur) | `strings.Builder` |
|---|---|---|
| 100 | quelques µs | ~1 µs |
| 10 000 | dizaines de ms | ~0,2 ms |
| 100 000 | plusieurs secondes | ~2 ms |

(Valeurs indicatives : mesurez chez vous avec un benchmark, voir [[tests#benchmarks]].)

## strings.Builder {#builder}

```go
var sb strings.Builder
sb.Grow(1024)                 // optionnel : réserve la taille si on la connaît
sb.WriteString("Bonjour")     // ajoute une string
sb.WriteByte(' ')             // un octet
sb.WriteRune('🌍')             // une rune
fmt.Fprintf(&sb, " n°%d", 42) // Builder est un io.Writer
resultat := sb.String()       // aucune copie supplémentaire
```

- Sa valeur zéro est prête à l'emploi.
- Il ne doit pas être **copié** après utilisation (passez `*strings.Builder`).
- `sb.Len()` donne la taille actuelle, `sb.Reset()` le vide.

Exemple : construire un tableau HTML.

```go
func TableHTML(lignes [][]string) string {
	var sb strings.Builder
	sb.WriteString("<table>\n")
	for _, ligne := range lignes {
		sb.WriteString("  <tr>")
		for _, cellule := range ligne {
			sb.WriteString("<td>")
			sb.WriteString(html.EscapeString(cellule))
			sb.WriteString("</td>")
		}
		sb.WriteString("</tr>\n")
	}
	sb.WriteString("</table>")
	return sb.String()
}
```

## strings.Join {#join}

Quand les morceaux sont déjà dans une slice, `strings.Join` calcule la taille totale, alloue **une seule fois** et copie :

```go
mots := []string{"Go", "est", "rapide"}
phrase := strings.Join(mots, " ") // "Go est rapide"
```

## fmt.Sprintf {#sprintf}

Très pratique pour la lisibilité, mais plus lent (analyse du format, réflexion). Parfait pour un message ponctuel, à éviter dans une boucle très sollicitée.

```go
msg := fmt.Sprintf("%s a %d ans", nom, age)
```

## strings.Builder ou bytes.Buffer ? {#buffer}

| | `strings.Builder` | `bytes.Buffer` |
|---|---|---|
| But | construire une string | tampon d'octets en lecture **et** écriture |
| `String()` | sans copie | avec copie |
| Lecture | non | oui (`Read`, `ReadString`…) |

Pour produire une string, `strings.Builder`. Pour manipuler des octets (encodage, réseau, fichiers), `bytes.Buffer`.

## L'opérateur + reste correct dans les cas simples {#plus}

`a + b + c` sur une seule expression est optimisé par le compilateur (une seule allocation). Inutile de sortir un Builder pour assembler trois morceaux.
