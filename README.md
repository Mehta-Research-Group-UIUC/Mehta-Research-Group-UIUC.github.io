# Mehta Research Group website

Static site built on **TXT by HTML5 UP**. No build step: upload this folder to any web host.

## Files
- `index.html`, `research.html`, `team.html`: the three pages.
- `assets/css/main.css`: the original TXT stylesheet (unchanged).
- `assets/css/mehta.css`: the group's theme (colours, type, layouts). Edit this, not main.css.
- `assets/js/fpf-hero.js`: the homepage animation, a real constant-gain feedback particle filter.
- `assets/js/mehta.js`: initials fallback for missing team photos, and the research-page sidebar highlight.
- `assets/js/main.js` etc.: TXT's original scripts (dropdown menus, mobile menu).
- `images/team/`: team photos (see README there).

## Adding a page
Copy `team.html` (full-width) or `research.html` (left sidebar), keep the header/nav/footer,
and replace what is inside `<section id="main">`. Move `class="current"` in the nav to the new page.
The nav is repeated on every page, so update it in all files when it changes.

## Not yet ported
Teaching, Awards, Gallery, Links and Contact, and the research sub-pages, still link to the
existing Google Site (https://mehta.mechse.illinois.edu/...). Swap those links for local files as pages are built,
and before the domain is switched over.

## Maths
`research.html` loads MathJax 3.2.2. Write inline maths as `\( ... \)` and display maths as `\[ ... \]`.
