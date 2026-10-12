---
title: Le package strings
category: stdlib
order: 1
level: débutant
summary: Le package strings regroupe toutes les opérations sur les chaînes : chercher (Contains, Index), découper (Split, Fields, Cut), assembler (Join, Builder), transformer (ToUpper, Replace, TrimSpace) et comparer (EqualFold).
aliases: strings, package strings, contains, split, join, replace, replaceall, toupper, tolower, majuscule, minuscule, trim, trimspace, enlever les espaces, hasprefix, hassuffix, commence par, finit par, index, fields, cut, repeat, count, equalfold, builder, strings.builder, découper une chaîne, séparer, rechercher dans une chaîne, title, capitalize
related: string, runes, conversions, faq-concat-rapide, faq-inverser-string
questions:
  - Comment découper une chaîne (split) ? -> decouper
  - Comment vérifier qu'une chaîne contient un mot ? -> chercher
  - Comment remplacer du texte dans une chaîne ? -> transformer
  - Comment supprimer les espaces au début et à la fin ? -> nettoyer
  - Comment mettre en majuscules ou en minuscules ? -> transformer
  - Comment mettre la première lettre en majuscule ? -> premiere-majuscule
  - Comment construire une chaîne efficacement ? -> builder
  - Comment comparer deux chaînes sans tenir compte de la casse ? -> comparer
---

@@ rapide

```go
import "strings"

s := "  Go est génial, Go est simple  "

strings.Contains(s, "génial")     // true
strings.Count(s, "Go")            // 2
strings.Index(s, "est")           // 5  (position en octets, -1 si absent)
strings.HasPrefix("gopher", "go") // true
strings.ToUpper("go")             // "GO"
strings.TrimSpace(s)              // "Go est génial, Go est simple"
strings.ReplaceAll(s, "Go", "Rust")
strings.Split("a,b,c", ",")       // ["a" "b" "c"]
strings.Fields(" a  b   c ")      // ["a" "b" "c"] (découpe sur les espaces)
strings.Join([]string{"a", "b"}, "-") // "a-b"
strings.Repeat("ab", 3)           // "ababab"
avant, apres, ok := strings.Cut("cle=valeur", "=") // "cle" "valeur" true
```

Les chaînes étant immuables, **toutes ces fonctions renvoient une nouvelle chaîne**. Pour construire une chaîne morceau par morceau, utilisez `strings.Builder`.

@@ detail

## Chercher {#chercher}

| Fonction | Résultat | Exemple |
|---|---|---|
| `Contains(s, sub)` | `sub` est dans `s` ? | `Contains("gopher", "ph")` → `true` |
| `ContainsAny(s, chars)` | un des caractères est présent ? | `ContainsAny("go", "xyz")` → `false` |
| `ContainsRune(s, r)` | la rune est présente ? | `ContainsRune("café", 'é')` → `true` |
| `HasPrefix(s, p)` | commence par `p` ? | `HasPrefix("main.go", "main")` → `true` |
| `HasSuffix(s, suf)` | finit par `suf` ? | `HasSuffix("main.go", ".go")` → `true` |
| `Index(s, sub)` | 1re position (octets), `-1` sinon | `Index("chicken", "ken")` → `4` |
| `LastIndex(s, sub)` | dernière position | `LastIndex("go gopher", "go")` → `3` |
| `IndexByte`, `IndexRune`, `IndexAny`, `IndexFunc` | variantes | `IndexFunc("abc1", unicode.IsDigit)` → `3` |
| `Count(s, sub)` | nombre d'occurrences | `Count("cheese", "e")` → `3` |

:::info Positions en octets
`Index` renvoie une position en **octets**, utilisable directement pour découper : `s[i:]`. Ce n'est pas le numéro du caractère si la chaîne contient des accents.
:::

## Découper {#decouper}

```go
strings.Split("a,b,,c", ",")                 // ["a" "b" "" "c"]  (garde les vides)
strings.SplitN("a,b,c,d", ",", 2)            // ["a" "b,c,d"]     (au plus 2 morceaux)
strings.SplitAfter("a,b,c", ",")             // ["a," "b," "c"]
strings.Fields("  un  deux\ttrois\n")        // ["un" "deux" "trois"] (tous les blancs)
strings.FieldsFunc("a1b2c", unicode.IsDigit) // ["a" "b" "c"]
```

`strings.Cut` (Go 1.18+) coupe autour de la **première** occurrence d'un séparateur. Parfait pour les paires clé/valeur :

```go
cle, valeur, trouve := strings.Cut("Content-Type: text/html", ": ")
// "Content-Type" "text/html" true

reste, ok := strings.CutPrefix("--verbose", "--") // "verbose" true (Go 1.20+)
nom, ok := strings.CutSuffix("photo.jpg", ".jpg") // "photo" true
```

Depuis Go 1.24, des **itérateurs** évitent de créer une slice intermédiaire :

```go
for partie := range strings.SplitSeq("a,b,c", ",") {
	fmt.Println(partie)
}
for ligne := range strings.Lines("un\ndeux\ntrois") {
	fmt.Print(ligne) // chaque ligne garde son « \n »
}
```

:::warning Split sur une chaîne vide
`strings.Split("", ",")` renvoie `[""]` (une slice contenant une chaîne vide), pas une slice vide. `strings.Fields("")` renvoie bien une slice vide.
:::

## Assembler {#assembler}

```go
strings.Join([]string{"2024", "01", "15"}, "-") // "2024-01-15"
strings.Repeat("=", 20)                         // "===================="
```

## Transformer {#transformer}

```go
strings.ToUpper("Élève")             // "ÉLÈVE" (gère l'Unicode)
strings.ToLower("GoLang")            // "golang"
strings.Replace("aaaa", "a", "b", 2) // "bbaa" (2 premières occurrences)
strings.ReplaceAll("aaaa", "a", "b") // "bbbb"
strings.Map(func(r rune) rune {      // transformer chaque rune
	if r == 'e' {
		return '3'
	}
	return r
}, "leet") // "l33t"
```

Pour plusieurs remplacements d'un coup, `strings.NewReplacer` est plus efficace :

```go
r := strings.NewReplacer("<", "&lt;", ">", "&gt;", "&", "&amp;")
fmt.Println(r.Replace("<b>Tom & Jerry</b>")) // &lt;b&gt;Tom &amp; Jerry&lt;/b&gt;
```

## Mettre la première lettre en majuscule {#premiere-majuscule}

`strings.Title` est **obsolète** (il gère mal l'Unicode). Pour une seule chaîne :

```go
func Capitaliser(s string) string {
	if s == "" {
		return s
	}
	r, taille := utf8.DecodeRuneInString(s)
	return string(unicode.ToUpper(r)) + s[taille:]
}

fmt.Println(Capitaliser("élan")) // Élan
```

Pour mettre une majuscule à chaque mot selon les règles d'une langue, le module `golang.org/x/text/cases` est la solution complète.

## Nettoyer {#nettoyer}

| Fonction | Effet | Exemple → résultat |
|---|---|---|
| `TrimSpace(s)` | retire les blancs au début et à la fin | `" hi \n"` → `"hi"` |
| `Trim(s, cutset)` | retire les **caractères** listés aux deux bouts | `Trim("xxhixx", "x")` → `"hi"` |
| `TrimLeft` / `TrimRight` | idem, d'un seul côté | `TrimLeft("0012", "0")` → `"12"` |
| `TrimPrefix(s, p)` | retire le **préfixe** exact s'il est présent | `TrimPrefix("v1.2", "v")` → `"1.2"` |
| `TrimSuffix(s, suf)` | retire le **suffixe** exact | `TrimSuffix("a.go", ".go")` → `"a"` |
| `TrimFunc(s, f)` | retire selon une fonction | `TrimFunc("123abc", unicode.IsDigit)` → `"abc"` |

:::warning Trim n'est pas TrimSuffix
`strings.TrimRight("hello.go.go", ".go")` donne `"hell"` : il retire **tous** les caractères `.`, `g` et `o` en fin de chaîne. Pour retirer une extension, utilisez `TrimSuffix`.
:::

## Comparer {#comparer}

```go
"go" == "go"                  // égalité stricte
strings.EqualFold("Go", "GO") // true : insensible à la casse (Unicode)
strings.Compare("a", "b")     // -1 (rarement utile : préférez == et <)
```

## Construire une chaîne : Builder {#builder}

`strings.Builder` accumule des morceaux dans un tampon, sans recréer de chaîne à chaque ajout :

```go
var sb strings.Builder
sb.Grow(64) // optionnel : réserve de la place
for i := 1; i <= 3; i++ {
	sb.WriteString("ligne ")
	sb.WriteString(strconv.Itoa(i))
	sb.WriteByte('\n')
}
sb.WriteRune('→')
fmt.Fprintf(&sb, " total : %d", 3) // Builder est un io.Writer
resultat := sb.String()
```

Sa valeur zéro est prête à l'emploi ; ne le copiez pas après usage. Comparaison des performances dans [[faq-concat-rapide]].

## Lire une chaîne comme un flux {#reader}

`strings.NewReader` transforme une chaîne en `io.Reader`, pour la passer à toute fonction qui lit un flux (parfait dans les tests) :

```go
sc := bufio.NewScanner(strings.NewReader("un\ndeux\ntrois"))
for sc.Scan() {
	fmt.Println(sc.Text())
}
```

## Les packages voisins {#voisins}

| Package | Pour |
|---|---|
| `strconv` | conversions texte ↔ nombres (voir [[conversions]]) |
| `unicode` | tester et transformer des runes (voir [[runes]]) |
| `unicode/utf8` | compter et décoder l'UTF-8 |
| `bytes` | les mêmes fonctions que `strings`, pour des `[]byte` |
| `regexp` | expressions régulières |
| `text/template` | génération de texte à partir de modèles |
| `fmt` | formatage (voir [[fmt]]) |

```go
re := regexp.MustCompile(`\d{2}/\d{2}/\d{4}`)
fmt.Println(re.FindAllString("nés le 01/02/1990 et le 15/08/1985", -1))
// [01/02/1990 15/08/1985]
```
