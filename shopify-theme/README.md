# Verdant — Shopify Online Store 2.0 theme

A single-origin tea storefront. JSON templates, sections everywhere, no build
step and no external dependencies — the 3D pouch, the misty tea-garden hero and
the brewing sequence are all drawn in CSS and WebGL, so the theme works before a
single product photo is uploaded.

## Installing

1. In Shopify admin, go to **Online Store → Themes**.
2. Under **Theme library**, choose **Add theme → Upload zip file**.
3. Select `verdant-shopify-theme.zip`.
4. **Customize** to edit, or **Publish** to make it live.

## Set up the lot metafields

The lot details (garden, altitude, harvest date) come from product metafields.
Without them the theme still works — each field is simply skipped — but the
specimen card and pouch label are the point of the design, so it is worth ten
minutes.

Go to **Settings → Custom data → Products → Add definition** and create these,
all under the namespace `verdant`:

| Key | Type | Example |
|---|---|---|
| `garden` | Single line text | `Huangshan, Anhui` |
| `altitude` | Single line text | `1,240 m` |
| `harvested` | Date | `2026-04-05` |
| `oxidation` | Single line text | `0 %` |
| `lot` | Single line text | `Lot 04` |

Use the product's **Type** field for the tea style (Green, Oolong, Pu-erh,
White) — the collection filter chips are built from it.

Variants become pouch sizes: name them `25 g`, `50 g`, `100 g` and the size
selector on the product page picks them up, updating price and availability.

## Sections

Every page is built from sections you can reorder, duplicate or remove in the
theme editor.

**Home** — Hero (tea garden), Brewing ritual, Gardens, Pouch story,
Featured lots, Testimonials, Trust badges, Newsletter.

**Product** — Product, Trust badges, Who / What / Why, How to prepare, FAQ,
You may also like.

**Collection** — Collection banner, Collection grid, Trust badges.

**Cart** — Cart, with a free-shipping meter and contextual upsells.

## Theme settings

- **Colours** — forest green and beige are the brand pair; the tea-liquor gold
  is the accent. Dark mode can follow the visitor's system setting, or be pinned.
- **Layout → Enable 3D and scroll animation** — turns off the WebGL hero,
  brewing sequence and pouch rotation. Visitors who ask for reduced motion get
  the static version regardless of this setting.
- **Cart → Free shipping threshold** — in store currency, no symbols. Blank
  hides the meter.
- **Typography** — the theme ships with a system serif + monospace pairing and
  loads no external fonts. Uncheck *Use the theme's built-in font stacks* to
  pick Shopify fonts instead.

## What checkout looks like

Shopify hosts and secures checkout itself, so this theme ends at the checkout
button. Payment methods, addresses and discount-code entry all live on
Shopify's checkout, which is not themeable outside Shopify Plus. Discount codes
are entered there, not on the cart page.

## Notes

- Passes `@shopify/theme-check-node` with zero offenses.
- The cart uses the Cart AJAX API with the Section Rendering API, so prices,
  discounts and currency formatting stay authoritative on Shopify's side.
- Product cards fall back to a green gradient when a product has no image, so
  the grid never shows a hole.
- The demo copy (gardens, growers, ratings) is placeholder. Replace it before
  launch — an invented rating costs more trust than it buys.
