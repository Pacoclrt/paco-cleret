# Gopédia — la documentation Go en français

Site de documentation complet du langage Go, en français. Chaque page propose une **explication rapide** (l'essentiel en 30 secondes) et une **explication détaillée**. Une recherche intégrée comprend aussi bien les mots-clés (« string ») que les questions (« comment vérifier si une clé existe dans une map ? »).

© Paco CLERET — [paco-cleret.fr](https://paco-cleret.fr)

## Lancer le site

Le site est 100 % statique, sans dépendance ni étape de compilation côté navigateur.

- Ouvrir directement `index.html` dans un navigateur, **ou**
- lancer un petit serveur local :

```bash
python3 -m http.server 8642
```

puis ouvrir <http://localhost:8642>.

## Structure

```text
index.html               page unique (navigation par ancre : #/slices, #/categorie/bases…)
assets/
  css/style.css          thème clair/sombre, mise en page responsive
  js/content.js          contenu généré (ne pas modifier à la main)
  js/markdown.js         rendu Markdown des pages
  js/highlight.js        coloration syntaxique (Go, terminal, JSON)
  js/search.js           moteur de recherche (synonymes, fautes de frappe, questions)
  js/app.js              routage, vues, palette de recherche (Ctrl/⌘ + K)
  img/favicon.svg
content/
  categories.json        les thèmes et leur ordre
  <thème>/<page>.md      une page de documentation par fichier
tools/build/main.go      compile content/ en assets/js/content.js et vérifie les liens
```

## Ajouter ou modifier une page

1. Créer ou éditer un fichier `.md` dans `content/<thème>/`. Le nom du fichier sert d'adresse (`content/bases/string.md` → `#/string`).
2. Régénérer le contenu (Go 1.24 ou plus) :

```bash
go run ./tools/build
```

L'outil refuse de générer le site si un lien interne, une ancre, une catégorie ou un niveau est invalide, et indique le fichier fautif.

### Format d'une page

```markdown
---
title: Les chaînes de caractères (string)
category: bases
order: 4
level: débutant            # débutant, intermédiaire ou avancé
summary: Une phrase qui résume la page (affichée sous le titre et dans la recherche).
aliases: string, chaîne, texte          # mots-clés supplémentaires pour la recherche
related: runes, package-strings         # pages liées (slugs)
questions:
  - Qu'est-ce qu'une string en Go ?
  - Comment concaténer des chaînes ? -> concatenation   # « -> ancre » facultatif
---

@@ rapide

L'essentiel, avec un exemple de code.

@@ detail

## Concaténation {#concatenation}

Explication complète…
```

Les **questions** sont reconnues par la recherche et renvoient directement vers l'ancre indiquée.

### Syntaxe Markdown disponible

| Élément | Syntaxe |
|---|---|
| Titres | `## Titre`, `### Sous-titre`, ancre explicite `## Titre {#mon-ancre}` |
| Code | ` ```go `, ` ```bash `, ` ```json `, ` ```output ` (sortie d'un programme), nom de fichier : ` ```go title=main.go ` |
| Encadrés | `:::tip`, `:::info`, `:::warning`, `:::danger` (titre facultatif après), fermés par `:::` |
| Lien interne | `[[slices]]`, `[[slices\|texte]]`, `[[slices#append\|texte]]` |
| Lien externe | `[texte](https://…)` (s'ouvre dans un nouvel onglet) |
| Tableaux, listes, citations, gras, italique, code en ligne | syntaxe Markdown habituelle |

## Mettre en ligne

Seuls `index.html` et le dossier `assets/` sont nécessaires en production. Ils peuvent être déposés sur n'importe quel hébergement statique (serveur web classique, GitHub Pages, Netlify, Cloudflare Pages…). Les dossiers `content/` et `tools/` ne servent qu'à la rédaction.

## Personnaliser

- **Nom du site** : constante `SITE` dans `assets/js/app.js`, balises `<title>` et logo dans `index.html`.
- **Couleurs** : variables CSS en tête de `assets/css/style.css` (thème clair, puis thème sombre).
- **Suggestions de recherche** de l'accueil : tableau `SUGGESTIONS` dans `assets/js/app.js`.
- **Synonymes** de la recherche : objet `SYN` dans `assets/js/search.js`.

Documentation indépendante, non affiliée au projet Go. Go est une marque de Google LLC.
