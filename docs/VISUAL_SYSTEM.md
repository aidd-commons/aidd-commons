# Visual system

This file records the site's interface, colour tokens, reading measures and theme contract.
The interface was revised on 2026-11-06 toward a scientific reference tool. The palette
measurements below describe the retained palette evidence, not a new usability study.

The site has two halves that must look like one site. The lessons, lab guides and historical report pages are rendered by Starlight. Home, Atlas index and resource details, Audit, Labs, Report and Contribute use
a shared custom shell in both interface languages. Both halves read the same colour, font and spacing
tokens from `site/src/styles/global.css`, and both halves answer to the same theme signal.

## Interface and reading hierarchy

The home page connects an AIDD question to an interactive scientific workflow,
background-specific learning entries, an actual retained result and resource reading.
The English and Chinese editions use one `HomeLanding.astro` component. Track and
record counts describe the collection and do not measure learning. A compact introduction
leads directly to the workflow and the retained EGFR example. Secondary search and
background routes follow. Track pages place the substantive view before progress
and prerequisites, and repeated conceptual context is available in a disclosure.

The same search form appears in the custom shell and Starlight. It sends an ordinary
GET query to `/search/?q=...` (or the Chinese navigation equivalent), where a compact
index connects resources, lessons, labs, routes, cases, views and other documents.
Ctrl/Command+K focuses that form. Source language stays distinct from navigation
language. Search rank is text matching, not scientific quality.

`/learn/` and its Chinese counterpart expose the canonical routes, track map/list,
prerequisites and local progress. Track hubs reuse the same IDs and scientific
teaching views. Atlas uses compact list/table/landscape views with a comparison
tray and evidence-adjacent detail. Labs and Report connect retained quantities to
their protocol and interpretation. Scientific object inspectors keep actual
coordinates, static projections and readable tables together. Plot legends can hide
individual series while preserving fixed axes; the table and CSV use exactly the
visible source rows. Without JavaScript, every source series remains available.

The figure library separates explanatory diagrams, retained-result plots and
interactive teaching views. Search and type state survive navigation. Enlarged
figures use a native dialog with keyboard focus containment and restoration;
direct PDF, PNG and available native PPTX downloads remain ordinary links.

Pages use a system sans-serif stack, including the platform's Chinese fallback, and a
system monospace stack for code and identifiers. There are no downloaded fonts. The shared
type scale keeps page titles around 30–45 px, body text at 16 px and secondary metadata at
12–14 px. The home title can reach 48 px on a wide screen. Starlight retains its document,
sidebar, search and pagination behavior, with the same font family, title scale and panel
surface as the custom shell. Chinese reading prose uses a slightly greater line height.

| Token                                       | Purpose                      | Value                                               |
| ------------------------------------------- | ---------------------------- | --------------------------------------------------- |
| `--atlas-shell-width`                       | Maximum custom-shell measure | `76rem`                                             |
| `--atlas-reading-width`                     | Starlight prose measure      | `46rem`                                             |
| `--atlas-radius`                            | Control corners              | `0.2rem`                                            |
| `--atlas-space-1` through `--atlas-space-8` | Shared spacing scale         | `0.25`, `0.5`, `0.75`, `1`, `1.5`, `2`, `3`, `4rem` |

Hairlines separate groups; strong borders identify controls. Flat reading surfaces replace
raised card shadows. A panel is useful where it groups evidence or controls, rather than as
a wrapper around every paragraph. Resource, lesson, audit and report headings use the same
scale. Dense numerical content keeps a local scroll region where necessary.

Primary controls and navigation links have a minimum 44 px touch height. At narrow widths the shared search occupies its own header row, the primary
navigation uses a labeled menu, workflow steps remain readable, and track and
comparison controls wrap without document overflow. Both page
families use the same small outlined wordmark. The custom navigation has a labeled menu
button, visible keyboard focus, Escape to
close and a usable link list when JavaScript is unavailable. The theme control, language
links, lesson progress and supported content remain available.

## The pinned tokens

Nine tokens carry the identity. Their values are pinned: they do not change with a redesign
of a page, and they are asserted verbatim in `tests/site/visual-system.test.ts` against both
`site/src/styles/global.css` and `report/figures/atlas_palette.py`. The same test asserts
that the figure palette carries the same nine values, so the site and the figures cannot
drift apart.

| Token               | Light     | Dark      |
| ------------------- | --------- | --------- |
| `--atlas-bg`        | `#fbf8f1` | `#10202e` |
| `--atlas-panel`     | `#fffdf8` | `#172b3b` |
| `--atlas-ink`       | `#13283d` | `#edf3f2` |
| `--atlas-muted`     | `#536675` | `#b7c6cc` |
| `--atlas-rule`      | `#ccd4d3` | `#3d5665` |
| `--atlas-teal`      | `#087c78` | `#4fc7bf` |
| `--atlas-teal-deep` | `#075e5c` | `#90e4dc` |
| `--atlas-coral`     | `#c85f51` | `#fc9a88` |
| `--atlas-focus`     | `#e05d44` | `#ffb15b` |

Two more tokens complete the shell. `--atlas-action-ink` is the text on a filled teal
button, `#fff` in the light theme and `#10202e` in the dark one. `--atlas-shadow` is
`none` in both themes; hierarchy comes from spacing, type and rules.

## The derived tokens

Three tokens are derived from the pinned nine. Each is named for what it is for, each is
present in both themes, and each is made by one of the two operations the figure palette is
also allowed to use, a mix in sRGB toward the ink token or a mix in sRGB toward the panel
token.

`--atlas-rule-strong` is the boundary of a user-interface component. `--atlas-rule` draws
structure that groups content, a card edge or a hairline separator, and it is allowed to be
faint. A control border is not allowed to be faint, because the reader has to find the edge
of the control to use it, so every control border points at `--atlas-rule-strong` instead.
This is the split WCAG 1.4.11 asks for, where a boundary that identifies a component needs
3:1 and a boundary that only groups content does not.

`--atlas-emphasis` is the coral family at a weight that can be read as body text. It is the
colour a link takes under the pointer and the colour a status label takes inside a card. The
pinned `--atlas-coral` cannot do that job in the light theme, where it measures 3.80:1 on the
page.

`--atlas-surface` is a quiet fill for a chip set into the page. It is the fill behind an inline
code block and behind Starlight's accent-low surfaces.

| Token                 | Light     | Measured against | Ratio   | Dark      | Measured against | Ratio  |
| --------------------- | --------- | ---------------- | ------- | --------- | ---------------- | ------ |
| `--atlas-rule-strong` | `#828f97` | `--atlas-panel`  | 3.27:1  | `#697d88` | `--atlas-panel`  | 3.38:1 |
| `--atlas-rule-strong` | `#828f97` | `--atlas-bg`     | 3.13:1  | `#697d88` | `--atlas-bg`     | 3.86:1 |
| `--atlas-emphasis`    | `#ad574e` | `--atlas-bg`     | 4.66:1  | `#faa798` | `--atlas-bg`     | 8.71:1 |
| `--atlas-emphasis`    | `#ad574e` | `--atlas-panel`  | 4.86:1  | `#faa798` | `--atlas-panel`  | 7.64:1 |
| `--atlas-surface`     | `#e3e6e4` | `--atlas-ink`    | 11.94:1 | `#2c4352` | `--atlas-ink`    | 9.21:1 |

The procedure is the WCAG 2.1 contrast ratio computed from the sRGB values with the standard
relative luminance formula. The component border and the link under the pointer were also
measured on the rendered page with a headless browser, and the rendered values are the
numbers in this table.

The two values that failed before this change are recorded here so that nobody re-introduces
them. The pinned `--atlas-rule` on the pinned `--atlas-panel` measures 1.48:1 in the light
theme and 1.88:1 in the dark one. The pinned `--atlas-coral` on the pinned `--atlas-bg`
measures 3.80:1 in the light theme, below the 4.5:1 that body text needs.

## How the theme is chosen

There is one signal. The `html` element carries a `data-theme` attribute whose value is
`light` or `dark`, and the reader's choice lives in `localStorage` under the key
`starlight-theme`. The key holds `light`, `dark`, or the empty string, and the empty string
means follow the operating system. This is the key and the attribute Starlight already uses,
so the two halves of the site answer to one control.

The custom shell runs the same bootstrap Starlight runs, in an inline script in the head, so
the attribute is set before the first paint and the page never flashes. The script reads the
key, falls back to `matchMedia("(prefers-color-scheme: light)")` when the key is empty, and
writes `document.documentElement.dataset.theme`.

The custom shell also carries a theme toggle in its header. The toggle is a button with an
accessible name that states the current theme and the one a click moves to. It cycles through
three states, the system setting, light and dark, writes the same key and updates the same
attribute. A reader who changes the theme on the atlas finds the lesson pages already
changed.

Starlight's own picker in the header of a lesson page writes the same key, so the two
controls never disagree.

The token set follows the attribute and not the operating system. The light values sit on
`:root`, the dark values sit on `:root[data-theme="dark"]`, and a
`@media (prefers-color-scheme: dark)` block keyed on `:root:not([data-theme="light"])` carries
the dark values for the short interval before the custom shell's bootstrap has run.
`color-scheme` is set per theme for the same reason, so form controls and scrollbars follow
the toggle rather than the operating system.

Starlight reads its colours from a set of `--sl-*` tokens that it declares inside
`@layer starlight.base`. `site/src/styles/global.css` is emitted unlayered, so the values it
declares outrank Starlight's. Colour mappings point to atlas tokens. Font, content-width,
navigation-height and heading-size mappings also align the two page families. The sidebar
and document navigation continue to use Starlight's native behavior.

The reason the mapping has to exist is measured. Before it, the atlas tokens followed the
operating system while the Starlight tokens followed the attribute, so a reader who touched
Starlight's own theme control put the two halves into different themes. A lesson heading
then measured 1.07:1 with the light theme forced on a reader whose system preferred the dark
one, and 1.06:1 with the dark theme forced on a reader whose system preferred the light one.
Both are the heading against the page it sat on.

## The figure palette

The figure palette is derived from the same nine tokens. `report/figures/atlas_palette.py` is
the source of truth, `site/src/data/atlas-palette.json` is its mirror for the site, and
`report/figures/measure_palette.py` measures it and writes the evidence to
`report/figures/out/palette-cvd.json`. The project decided on 2026-10-21 to put every visual
on the teal and coral identity the site already carries. The gates did not change with that
decision.

The categorical set is four colours, one per role, and the roles are the same in both themes
so that a chart does not have to rename its series when the page changes theme.

| Role  | Light     | Dark      |
| ----- | --------- | --------- |
| teal  | `#399693` | `#4fc7bf` |
| coral | `#c85f51` | `#bd7366` |
| ember | `#8c4239` | `#ffb15b` |
| slate | `#4d5f6d` | `#808b8f` |

The ordered ladder is a separate artefact for data with a direction. It stays in the teal
family and runs pale to deep in the light theme and deep to pale in the dark one, because
the dark end of a ramp has to be the visible end on a dark panel.

| Step | Light     | Dark      |
| ---- | --------- | --------- |
| 0    | `#e6f2f1` | `#2c5c68` |
| 1    | `#b5dcda` | `#3f8183` |
| 2    | `#77b9bd` | `#5ba39d` |
| 3    | `#35757f` | `#86c9c3` |
| 4    | `#123a49` | `#bce8e3` |

The pale washes for bar interiors are `#dfeeee`, `#f6e5e3`, `#ede1df` and `#e3e5e8` in the
light theme and `#245a56`, `#55342e`, `#735029` and `#3a3f40` in the dark one, in the order
teal, coral, ember and slate.

## The second channel

Colour alone never carries a category. Every categorical key resolves in all three mappings,
so a printed figure, a projector and a photocopy still separate the series after colour has
been taken away.

| Role  | Marker | Hatch | Dash                |
| ----- | ------ | ----- | ------------------- |
| teal  | `o`    | none  | solid               |
| coral | `s`    | `//`  | `--`                |
| ember | `^`    | `\\`  | `:`                 |
| slate | `D`    | `xx`  | `(0, (3, 1, 1, 1))` |

A line or a curve carries a marker and a linestyle. A scatter carries a marker shape. A bar,
a stacked bar, a filled area, a pie slice, a box body and a heatmap cell carry a hatch, and
a hatch draws in the edge colour, so an edge colour has to be passed with it.

## The measured palette gates

`report/figures/out/palette-cvd.json` holds the measurement. The floor for colour-vision
distance is 10.0 CIEDE2000 under deuteranopia and under protanopia, and
`tests/site/visual-system.test.ts` asserts that floor literally. The test reads
`record.cvd_floor` and `record.floors.cvd_ciede2000` and requires both to equal 10.0, reads
the floor declared in `report/figures/atlas_palette.py` and requires the same 10.0, and then
requires the worst measured deutan and protan distance of each theme to be at or above the
floor and every gate of both themes to have passed.

The other constraints are a maximum categorical luminance-spread budget of 0.22, a contrast
floor of 3.0 against the panel a colour is drawn on, and a minimum adjacent luminance gap
of 0.05 in the ladder. The measurement record names the spread constraint
`luminance_budget`; a smaller spread passes that constraint.

| Measure                                                      | Light                      | Dark                       |
| ------------------------------------------------------------ | -------------------------- | -------------------------- |
| Worst pair, normal vision                                    | 15.43, coral against ember | 24.00, teal against slate  |
| Worst pair, deuteranopia                                     | 15.21, teal against slate  | 13.07, teal against slate  |
| Worst pair, protanopia                                       | 14.03, coral against ember | 14.63, teal against slate  |
| Worst pair, tritanopia                                       | 15.39, coral against ember | 17.27, coral against ember |
| Lowest categorical contrast on its own panel                 | 3.47, teal                 | 4.02, coral                |
| Luminance spread of the categorical set                      | 0.186                      | 0.147                      |
| Smallest adjacent gap in the ladder                          | 0.139                      | 0.090                      |
| Smallest distance from a ladder step to a categorical colour | 12.75                      | 6.08                       |

Tritanopia distances are reported because the house gates do not gate on them, and a palette
that is only legible to dichromats is not a palette.

The categorical set and the ladder are kept disjoint, so a pale colour never means a category
in one panel and a high value on the scale in the next.

## Source figures on the site

Scientific previews are source-generated PNGs on an explicit paper-coloured surface in
both interface themes. Each preview opens the corresponding source-generated vector PDF,
and an explicit PDF download link remains alongside its caption. Intrinsic dimensions and
meaningful alt text belong to the figure manifest and `AtlasFigure.astro`. The interface
does not recolour scientific marks through CSS.

`site/scripts/make-site-figures.py` imports the native report generators and saves PDF and
PNG pairs. `site/scripts/check-site-figures.py` checks source freshness, placements and
delivery. Site builds run the check; they do not silently redraw stale scientific figures.
Existing author SVG inputs are preserved, and this delivery route generates no SVG.

An earlier inline-SVG route mapped categorical colours onto brand tokens. Its light-theme
coral/focus pair measured only 6.06 CIEDE2000 under deuteranopia, below the derived palette's
10.0 floor. That historical cost is retained here as a warning against substituting brand
colours for measured scientific encodings. Current previews use their source palette and
its redundant marker, hatch and line encodings.

## What this file does not cover

Starlight's aside hue families are left at their defaults. No page in this site uses an
aside, and mapping four more hue families would mean inventing colours that no measurement
in this repository covers. An aside added later has to be mapped onto the teal and coral
families before publication.
