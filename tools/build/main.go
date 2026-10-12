// Command build transforme les pages Markdown du dossier content/ en un
// fichier JavaScript (assets/js/content.js) chargé par le site.
//
// Il vérifie aussi la cohérence du contenu : slugs uniques, catégories
// existantes, niveaux valides, liens internes ([[slug]] et #/slug) et ancres.
//
// Utilisation, depuis la racine du site :
//
//	go run ./tools/build
package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"time"
)

// Category regroupe des pages dans la navigation.
type Category struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
}

// Question est une question à laquelle une page répond, éventuellement
// rattachée à une ancre précise de la page.
type Question struct {
	Text   string `json:"text"`
	Anchor string `json:"anchor,omitempty"`
}

// Page est une page de documentation.
type Page struct {
	Slug      string     `json:"slug"`
	Title     string     `json:"title"`
	Category  string     `json:"category"`
	Order     int        `json:"order"`
	Level     string     `json:"level"`
	Summary   string     `json:"summary"`
	Aliases   []string   `json:"aliases"`
	Related   []string   `json:"related"`
	Questions []Question `json:"questions"`
	Quick     string     `json:"quick"`
	Detail    string     `json:"detail"`

	file    string
	anchors map[string]bool
}

type data struct {
	Generated  string     `json:"generated"`
	Categories []Category `json:"categories"`
	Pages      []*Page    `json:"pages"`
}

var levels = []string{"débutant", "intermédiaire", "avancé"}

// Ancres réservées par la mise en page (les deux blocs d'explication).
var reservedAnchors = []string{"rapide", "detail"}

func main() {
	contentDir := flag.String("content", "content", "dossier contenant les pages Markdown")
	outFile := flag.String("out", filepath.Join("assets", "js", "content.js"), "fichier JavaScript à générer")
	flag.Parse()

	cats, err := loadCategories(filepath.Join(*contentDir, "categories.json"))
	if err != nil {
		fail(err)
	}
	pages, err := loadPages(*contentDir)
	if err != nil {
		fail(err)
	}
	if errs := validate(cats, pages); len(errs) > 0 {
		for _, e := range errs {
			fmt.Fprintln(os.Stderr, "✗", e)
		}
		fail(fmt.Errorf("%d erreur(s) dans le contenu", len(errs)))
	}

	catIndex := make(map[string]int, len(cats))
	for i, c := range cats {
		catIndex[c.ID] = i
	}
	slices.SortFunc(pages, func(a, b *Page) int {
		if d := catIndex[a.Category] - catIndex[b.Category]; d != 0 {
			return d
		}
		if d := a.Order - b.Order; d != 0 {
			return d
		}
		return strings.Compare(a.Slug, b.Slug)
	})

	out := data{Generated: time.Now().Format(time.RFC3339), Categories: cats, Pages: pages}
	if err := writeJS(*outFile, out); err != nil {
		fail(err)
	}
	fmt.Printf("✓ %d pages dans %d catégories → %s\n", len(pages), len(cats), *outFile)
}

func fail(err error) {
	fmt.Fprintln(os.Stderr, "build:", err)
	os.Exit(1)
}

func loadCategories(path string) ([]Category, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var cats []Category
	if err := json.Unmarshal(raw, &cats); err != nil {
		return nil, fmt.Errorf("%s : %w", path, err)
	}
	return cats, nil
}

func loadPages(dir string) ([]*Page, error) {
	var pages []*Page
	err := filepath.WalkDir(dir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() || filepath.Ext(path) != ".md" || strings.HasPrefix(d.Name(), "_") {
			return nil
		}
		raw, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		p, err := parsePage(path, string(raw))
		if err != nil {
			return fmt.Errorf("%s : %w", path, err)
		}
		pages = append(pages, p)
		return nil
	})
	return pages, err
}

func parsePage(path, src string) (*Page, error) {
	src = strings.ReplaceAll(src, "\r\n", "\n")
	if !strings.HasPrefix(src, "---\n") {
		return nil, errors.New("en-tête (front matter) manquant")
	}
	end := strings.Index(src[4:], "\n---\n")
	if end < 0 {
		return nil, errors.New("en-tête (front matter) non terminé")
	}
	p := &Page{
		Slug:      strings.TrimSuffix(filepath.Base(path), ".md"),
		Aliases:   []string{},
		Related:   []string{},
		Questions: []Question{},
		file:      path,
	}
	if err := parseFrontMatter(src[4:4+end], p); err != nil {
		return nil, err
	}
	quick, detail, err := splitBody(src[4+end+5:])
	if err != nil {
		return nil, err
	}
	p.Quick, p.Detail = quick, detail
	p.anchors = collectAnchors(quick, detail)
	return p, nil
}

func parseFrontMatter(fm string, p *Page) error {
	inQuestions := false
	for i, line := range strings.Split(fm, "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}
		if item, ok := strings.CutPrefix(trimmed, "- "); ok {
			if !inQuestions {
				return fmt.Errorf("ligne %d : élément de liste hors de « questions »", i+2)
			}
			q := Question{Text: strings.TrimSpace(item)}
			if text, anchor, found := strings.Cut(item, "->"); found {
				q = Question{Text: strings.TrimSpace(text), Anchor: strings.TrimSpace(anchor)}
			}
			p.Questions = append(p.Questions, q)
			continue
		}
		key, value, ok := strings.Cut(trimmed, ":")
		if !ok {
			return fmt.Errorf("ligne %d : « clé: valeur » attendu", i+2)
		}
		key, value = strings.TrimSpace(key), strings.TrimSpace(value)
		if len(value) >= 2 && value[0] == '"' && value[len(value)-1] == '"' {
			value = value[1 : len(value)-1]
		}
		inQuestions = false
		switch key {
		case "title":
			p.Title = value
		case "slug":
			p.Slug = value
		case "category":
			p.Category = value
		case "order":
			n, err := strconv.Atoi(value)
			if err != nil {
				return fmt.Errorf("ligne %d : order doit être un entier", i+2)
			}
			p.Order = n
		case "level":
			p.Level = value
		case "summary":
			p.Summary = value
		case "aliases":
			p.Aliases = splitList(value)
		case "related":
			p.Related = splitList(value)
		case "questions":
			inQuestions = true
		default:
			return fmt.Errorf("ligne %d : clé inconnue %q", i+2, key)
		}
	}
	return nil
}

func splitList(s string) []string {
	out := []string{}
	for part := range strings.SplitSeq(s, ",") {
		if part = strings.TrimSpace(part); part != "" {
			out = append(out, part)
		}
	}
	return out
}

// splitBody sépare le corps en deux blocs, introduits par les lignes
// « @@ rapide » et « @@ detail ».
func splitBody(body string) (quick, detail string, err error) {
	var cur *[]string
	var q, d []string
	for _, line := range strings.Split(body, "\n") {
		switch strings.TrimSpace(line) {
		case "@@ rapide":
			cur = &q
			continue
		case "@@ detail":
			cur = &d
			continue
		}
		if cur != nil {
			*cur = append(*cur, line)
		} else if strings.TrimSpace(line) != "" {
			return "", "", errors.New("texte avant « @@ rapide »")
		}
	}
	quick = strings.TrimSpace(strings.Join(q, "\n"))
	detail = strings.TrimSpace(strings.Join(d, "\n"))
	if quick == "" || detail == "" {
		return "", "", errors.New("les blocs « @@ rapide » et « @@ detail » sont obligatoires")
	}
	return quick, detail, nil
}

var (
	headingRe  = regexp.MustCompile(`^(#{2,4})\s+(.+?)\s*(?:\{#([\w-]+)\})?\s*$`)
	wikiLinkRe = regexp.MustCompile(`\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|[^\]]+)?\]\]`)
	hashLinkRe = regexp.MustCompile(`\]\(#/([^)/?#\s]+)(?:/([^)\s]+))?\)`)
	inlineCode = regexp.MustCompile("`[^`\n]+`")
	nonAlnum   = regexp.MustCompile(`[^a-z0-9]+`)
)

// collectAnchors reproduit exactement l'attribution des identifiants de titres
// faite par assets/js/markdown.js (bloc rapide puis bloc détaillé).
func collectAnchors(blocks ...string) map[string]bool {
	seen := map[string]int{}
	for _, r := range reservedAnchors {
		seen[r] = 1
	}
	for _, md := range blocks {
		inFence := false
		for _, line := range strings.Split(md, "\n") {
			if strings.HasPrefix(line, "```") {
				inFence = !inFence
				continue
			}
			if inFence {
				continue
			}
			m := headingRe.FindStringSubmatch(line)
			if m == nil {
				continue
			}
			id := m[3]
			if id == "" {
				id = slugify(m[2])
			}
			if n, ok := seen[id]; ok {
				seen[id] = n + 1
				id = fmt.Sprintf("%s-%d", id, n+1)
			}
			seen[id] = max(seen[id], 1)
		}
	}
	anchors := make(map[string]bool, len(seen))
	for id := range seen {
		anchors[id] = true
	}
	return anchors
}

var foldMap = map[rune]string{
	'à': "a", 'â': "a", 'ä': "a", 'á': "a", 'ã': "a", 'å': "a",
	'ç': "c", 'é': "e", 'è': "e", 'ê': "e", 'ë': "e",
	'î': "i", 'ï': "i", 'í': "i", 'ì': "i",
	'ô': "o", 'ö': "o", 'ó': "o", 'ò': "o", 'õ': "o",
	'ù': "u", 'û': "u", 'ü': "u", 'ú': "u", 'ÿ': "y", 'ñ': "n",
	'œ': "oe", 'æ': "ae",
}

func slugify(s string) string {
	s = strings.ToLower(strings.Map(func(r rune) rune {
		if strings.ContainsRune("`*[]", r) {
			return -1
		}
		return r
	}, s))
	var b strings.Builder
	for _, r := range s {
		if f, ok := foldMap[r]; ok {
			b.WriteString(f)
		} else {
			b.WriteRune(r)
		}
	}
	return strings.Trim(nonAlnum.ReplaceAllString(b.String(), "-"), "-")
}

// stripCode retire les blocs et extraits de code, où les liens ne sont pas interprétés.
func stripCode(md string) string {
	var b strings.Builder
	inFence := false
	for _, line := range strings.Split(md, "\n") {
		if strings.HasPrefix(line, "```") {
			inFence = !inFence
			continue
		}
		if !inFence {
			b.WriteString(inlineCode.ReplaceAllString(line, ""))
			b.WriteByte('\n')
		}
	}
	return b.String()
}

func validate(cats []Category, pages []*Page) []error {
	var errs []error
	report := func(p *Page, format string, args ...any) {
		errs = append(errs, fmt.Errorf("%s : %s", p.file, fmt.Sprintf(format, args...)))
	}

	catIDs := map[string]bool{}
	for _, c := range cats {
		catIDs[c.ID] = true
	}
	bySlug := map[string]*Page{}
	for _, p := range pages {
		if prev, dup := bySlug[p.Slug]; dup {
			report(p, "slug %q déjà utilisé par %s", p.Slug, prev.file)
		}
		bySlug[p.Slug] = p
	}

	checkTarget := func(p *Page, slug, anchor, where string) {
		target, ok := bySlug[slug]
		if !ok {
			report(p, "%s : page %q introuvable", where, slug)
			return
		}
		if anchor != "" && !target.anchors[anchor] {
			report(p, "%s : ancre %q introuvable dans %q", where, anchor, slug)
		}
	}

	for _, p := range pages {
		if p.Title == "" {
			report(p, "title manquant")
		}
		if p.Summary == "" {
			report(p, "summary manquant")
		}
		if !catIDs[p.Category] {
			report(p, "catégorie %q inconnue", p.Category)
		}
		if !slices.Contains(levels, p.Level) {
			report(p, "niveau %q invalide (attendu : %s)", p.Level, strings.Join(levels, ", "))
		}
		for _, r := range p.Related {
			checkTarget(p, r, "", "related")
		}
		for _, q := range p.Questions {
			if q.Anchor != "" && !p.anchors[q.Anchor] {
				report(p, "question %q : ancre %q introuvable", q.Text, q.Anchor)
			}
		}
		body := stripCode(p.Quick + "\n" + p.Detail)
		for _, m := range wikiLinkRe.FindAllStringSubmatch(body, -1) {
			checkTarget(p, strings.TrimSpace(m[1]), m[2], "lien "+m[0])
		}
		for _, m := range hashLinkRe.FindAllStringSubmatch(body, -1) {
			if m[1] == "recherche" || m[1] == "categorie" {
				continue
			}
			checkTarget(p, m[1], m[2], "lien "+m[0])
		}
	}
	return errs
}

func writeJS(path string, d data) error {
	var buf bytes.Buffer
	buf.WriteString("/* Fichier généré par « go run ./tools/build » à partir de content/. Ne pas modifier à la main. */\n")
	buf.WriteString("window.GODOC_DATA = ")
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(d); err != nil {
		return err
	}
	buf.Truncate(buf.Len() - 1) // retire le saut de ligne ajouté par Encode
	buf.WriteString(";\n")
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, buf.Bytes(), 0o644)
}
