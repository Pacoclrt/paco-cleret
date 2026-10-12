---
title: Pourquoi mes champs n'apparaissent-ils pas dans le JSON ?
category: faq
order: 22
level: débutant
summary: encoding/json ne voit que les champs exportés, c'est-à-dire ceux qui commencent par une Majuscule. Mettez une majuscule au champ et ajoutez un tag `json:"nom"` pour choisir le nom en minuscules dans le JSON.
aliases: json vide, champ json manquant, json {} vide, struct json vide, champ non exporté, majuscule json, minuscule json, unmarshal ne remplit pas, json ignore champ, unexported field
related: json, packages, structs
questions:
  - Pourquoi json.Marshal renvoie {} ?
  - Pourquoi json.Unmarshal ne remplit pas ma struct ? -> unmarshal
  - Comment avoir des noms de champs en minuscules dans le JSON ? -> tags
---

@@ rapide

```go
type Utilisateur struct {
	nom string // ❌ minuscule : invisible pour encoding/json
	age int
}
data, _ := json.Marshal(Utilisateur{"Ada", 36})
fmt.Println(string(data)) // {}

type UtilisateurOK struct {
	Nom string `json:"nom"` // ✅ exporté + nom JSON en minuscules
	Age int    `json:"age"`
}
data, _ = json.Marshal(UtilisateurOK{"Ada", 36})
fmt.Println(string(data)) // {"nom":"Ada","age":36}
```

En Go, un nom en **minuscule** est **privé à son package**. Or `json.Marshal` est dans le package `encoding/json` : il ne peut pas accéder aux champs privés de vos structs.

@@ detail

## La règle de visibilité {#visibilite}

| Nom du champ | Visible par `encoding/json` | Dans le JSON |
|---|---|---|
| `Nom string` | oui | `"Nom"` |
| ``Nom string `json:"nom"` `` | oui | `"nom"` |
| `nom string` | **non** | absent |
| ``nom string `json:"nom"` `` | **non** (le tag ne change rien) | absent |

Un tag sur un champ privé est ignoré : `go vet` le signale d'ailleurs (*struct field nom has json tag but is not exported*).

## Unmarshal ne remplit pas ma struct {#unmarshal}

Même cause, plus trois autres possibilités :

```go
var u Utilisateur
json.Unmarshal(data, u)  // ❌ 1. pas de pointeur : erreur « non-pointer »
json.Unmarshal(data, &u) // ✅

// 2. Champ privé : jamais rempli
// 3. Nom différent : le JSON contient "username" mais le champ s'appelle Nom
type U struct {
	Nom string `json:"username"` // ✅ faire correspondre le nom
}
// 4. Erreur ignorée : vérifiez toujours le retour de Unmarshal !
if err := json.Unmarshal(data, &u); err != nil {
	log.Fatal(err)
}
```

La correspondance des noms est insensible à la casse (`"NOM"` remplit `Nom`), mais `"user_name"` ne correspondra jamais à `UserName` sans tag.

## Les tags {#tags}

```go
type Produit struct {
	ID          int     `json:"id"`
	NomComplet  string  `json:"nom_complet"`           // snake_case côté JSON
	Description string  `json:"description,omitempty"` // omis si vide
	PrixHT      float64 `json:"prix_ht"`
	Interne     string  `json:"-"` // exporté en Go, mais exclu du JSON
}
```

Voir [[json#tags]] pour toutes les options.

## Garder un champ privé mais le sérialiser {#prive}

Si vous voulez vraiment un champ privé (pour forcer le passage par des méthodes), implémentez `MarshalJSON` avec une struct intermédiaire :

```go
type Compte struct {
	solde int
}

func (c Compte) MarshalJSON() ([]byte, error) {
	return json.Marshal(struct {
		Solde int `json:"solde"`
	}{c.solde})
}
```

## Les autres encodeurs aussi {#autres}

La même règle s'applique à `encoding/xml`, `encoding/gob`, `text/template`, `html/template` et à la plupart des bibliothèques (ORM, YAML, TOML) : seuls les champs **exportés** sont accessibles. Voir [[packages#visibilite]].
