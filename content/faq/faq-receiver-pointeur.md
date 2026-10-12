---
title: "Receiver pointeur ou valeur : lequel choisir ?"
category: faq
order: 6
level: intermédiaire
summary: Utilisez un receiver pointeur (*T) si la méthode modifie la valeur, si la struct est grosse ou contient un mutex. Sinon un receiver valeur convient. Dans le doute, choisissez le pointeur, et restez cohérent pour toutes les méthodes du type.
aliases: receiver pointeur, receiver valeur, pointer receiver, value receiver, func (t *T), func (t T), méthode pointeur, méthode valeur, quand utiliser un pointeur, ma méthode ne modifie pas
related: methodes, pointeurs, structs, interfaces
questions:
  - Faut-il utiliser un receiver pointeur ou valeur ?
  - Pourquoi ma méthode ne modifie pas ma struct ? -> ne-modifie-pas
  - Pourquoi mon type n'implémente pas l'interface (pointer receiver) ? -> interfaces
---

@@ rapide

| Choisissez `func (t *T)` si… | Choisissez `func (t T)` si… |
|---|---|
| la méthode **modifie** `t` | `t` est petit et n'est pas modifié |
| `T` est une **grosse** struct | `T` est un type de base (`type Celsius float64`) |
| `T` contient un `sync.Mutex` ou ne doit pas être copié | `T` est une map, un channel ou une fonction |
| d'autres méthodes de `T` ont déjà un receiver pointeur | `T` représente une valeur immuable (`time.Time`) |

```go
type Compte struct{ Solde int }

func (c *Compte) Deposer(m int) { c.Solde += m }        // modifie : pointeur
func (c Compte) EstVide() bool  { return c.Solde == 0 } // lecture : valeur possible

// … mais pour la cohérence, on mettrait aussi *Compte sur EstVide
```

**Règle pratique** : dans le doute, pointeur. Et une fois choisi, **toutes** les méthodes du type utilisent le même genre de receiver.

@@ detail

## Ma méthode ne modifie pas ma struct {#ne-modifie-pas}

C'est le symptôme classique d'un receiver valeur :

```go
type Joueur struct{ Score int }

func (j Joueur) Gagner() { j.Score += 10 } // ⚠️ j est une COPIE

p := Joueur{}
p.Gagner()
fmt.Println(p.Score) // 0
```

Avec un receiver pointeur, la méthode travaille sur l'original :

```go
func (j *Joueur) Gagner() { j.Score += 10 }

p := Joueur{}
p.Gagner()           // Go passe automatiquement &p
fmt.Println(p.Score) // 10
```

## Le coût de la copie {#cout}

Avec un receiver valeur, **toute la struct** est copiée à chaque appel. Pour une struct de quelques champs, c'est négligeable (et parfois plus rapide qu'un pointeur). Pour une struct de plusieurs centaines d'octets appelée dans une boucle, ça compte.

## Les types qui ne doivent pas être copiés {#non-copiables}

Un `sync.Mutex` copié est un **autre** verrou : la protection disparaît.

```go
type Cache struct {
	mu   sync.Mutex
	data map[string]string
}

func (c Cache) Get(k string) string { // ❌ copie le mutex
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.data[k]
}
```

`go vet` le signale : *Get passes lock by value*. Utilisez `func (c *Cache) Get`.

## L'impact sur les interfaces {#interfaces}

Les méthodes à receiver **pointeur** n'appartiennent qu'au type **pointeur** `*T` :

```go
type Gagnant interface{ Gagner() }

func (j *Joueur) Gagner() { j.Score += 10 }

var g Gagnant
g = &Joueur{} // ✅
g = Joueur{}  // ❌ Joueur does not implement Gagnant (method Gagner has pointer receiver)
```

Si votre type « n'implémente pas » une interface alors que la méthode existe, vérifiez le receiver : il faut probablement passer `&valeur`.

## Pourquoi la cohérence ? {#coherence}

Mélanger receivers valeur et pointeur sur un même type crée de la confusion : certaines méthodes voient les modifications, d'autres non, et seul `*T` implémente certaines interfaces. Le guide de style officiel recommande donc de **ne pas mélanger**.

Exceptions admises : les types conçus pour être des **valeurs** (`time.Time`, `netip.Addr`, petites structs immuables) utilisent des receivers valeur partout, et renvoient une nouvelle valeur au lieu de se modifier :

```go
type Point struct{ X, Y float64 }

func (p Point) Deplacer(dx, dy float64) Point { // renvoie un nouveau Point
	return Point{p.X + dx, p.Y + dy}
}
```

Voir [[methodes]] et [[pointeurs]].
