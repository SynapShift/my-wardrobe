# 我的衣柜 Product Plan

## Direction

Build a mobile-first web app for managing a personal wardrobe. The first release should feel like a practical private album for clothes: upload, classify, search, and combine outfits. Native apps can wait; the web version should work well on mobile browsers and be easy to open source.

## Product Principles

- Mobile first: all core flows must be comfortable on a phone screen.
- Local-first option: personal wardrobe photos are private, so the app should support local/dev storage first and allow cloud storage later.
- Manual control first, AI later: P0 should not depend on image recognition accuracy.
- Open source friendly: simple setup, clear docs, no paid services required for the basic version.
- Small useful releases: each phase should produce a usable product, not just infrastructure.

## P0 - Usable Wardrobe MVP

Goal: users can upload clothing photos, classify them, browse their wardrobe, and search/filter on mobile.

### Features

- Mobile-first responsive web layout.
- Add clothing item:
  - Upload one image.
  - Enter name.
  - Select category.
  - Select season.
  - Select primary color.
  - Enter optional purchase price.
  - Add optional notes.
- Wardrobe list:
  - Card grid optimized for phone screens.
  - Image, name, category, color, season.
  - Show wear count and price badges when available.
  - Empty state.
- Wardrobe sorting:
  - Recently added.
  - Most worn.
  - Recently worn.
  - Highest price.
- Clothing detail page:
  - Large image.
  - Metadata.
  - Edit and delete actions.
  - Edit name, photo, category, season, color, price, tags, and notes.
  - Placeholder section for related outfits, shown after P1 is implemented.
- Filters:
  - Category.
  - Season.
  - Color.
  - Result count and reset filters action.
- Basic keyword search.
- Data persistence:
  - Store item metadata.
  - Store uploaded image path or blob reference.
  - P0 hardening: new uploads are stored as image blobs in IndexedDB while metadata stays lightweight in localStorage.
- Open source basics:
  - README.
  - License.
  - Local setup instructions.
  - Example environment file if needed.
- Local backup:
  - Export wardrobe data as JSON.
  - Import a previous JSON backup.

### Default Categories

- Tops
- Bottoms
- Outerwear
- Dresses
- Shoes
- Bags
- Accessories
- Sportswear
- Homewear
- P1 hardening: settings can batch-move items from one built-in category to another.
- P1 hardening: users can add and remove custom category names from settings.

### Default Seasons

- Spring
- Summer
- Autumn
- Winter
- All season

### P0 Non-goals

- AI clothing recognition.
- Auto background removal.
- Account system.
- Outfit recommendation.
- Cloud sync.
- Calendar.

## P1 - Outfit Builder

Goal: users can create and save outfits from existing wardrobe items.

### Features

- Outfit creation flow:
  - Pick items from wardrobe.
  - Filter wardrobe items by category while picking.
  - Search wardrobe items while picking.
  - Preview selected items and remove them quickly.
  - Group selected items into an outfit.
  - Name the outfit.
  - Add scenario tags such as work, travel, date, casual, party.
  - Start a new outfit from a clothing item detail page with that item preselected.
- Outfit list:
  - Mobile-friendly saved outfit cards.
  - Preview using selected item images.
  - Show item count and wear count badges.
  - Search outfits by name, scenario tags, notes, and included item names.
- Outfit detail page:
  - View all items in the outfit.
  - Edit outfit name, scenario tags, notes, and selected items.
  - Delete outfit.
- Item relationship:
  - Show related outfits on each clothing item detail page.
  - First show saved outfits that already include this item.
  - Later show suggested outfits that could include this item.
- Better tags:
  - Custom tags for clothing and outfits.
  - P1 first slice: wardrobe tags are collected automatically and can be used as filter chips.
  - P1 hardening: item tags can be renamed or removed from the settings page.

### Related Outfit Design

When viewing a clothing item, the detail page should answer: "How can I wear this?"

P1 should support saved related outfits:

- Show outfit cards that include the current item.
- Each card shows the outfit name, scenario tags, and a small image collage.
- If no related outfits exist, show a useful empty state:
  - "No outfits yet."
  - Primary action: create an outfit with this item.
- From the detail page, users can start a new outfit with this item preselected.
- Users can remove the item from an outfit from the outfit edit page, not directly from the item detail page.

P3 can add suggested related outfits:

- Suggest items that match by category, season, color, and tags.
- Separate saved outfits from suggested outfits visually.
- Suggested outfits should be saveable, dismissible, and editable.

### P1 Non-goals

- Automatic outfit generation.
- Calendar analytics.
- Multi-user sharing.

## P2 - Wearing History And Insights

Goal: users can track what they wore and understand what they actually use.

### Features

- Wear log:
  - Mark an item or outfit as worn today.
  - Pick a date manually.
  - Optional note for weather or occasion.
  - P2 first slice: support date-based wear logging from item and outfit detail pages.
  - P2 first slice: support optional notes on wear logs.
  - Show a full wear history page grouped by date.
  - Search and filter wear history by date.
  - Allow deleting mistaken wear logs.
- Calendar view:
  - Month view optimized for mobile.
  - Show logged outfits or items.
  - P2 first slice: show a compact month calendar in history with daily wear counts and date filtering.
- Item stats:
  - Times worn.
  - Last worn date.
  - Cost per wear if purchase price exists.
  - P2 first slice: show cost per wear on item detail after wear logs exist.
- Wardrobe insights:
  - Never worn.
  - Not worn recently.
  - Most worn.
  - Category distribution.
  - Color distribution.
  - P2 first slice: show most worn, unworn count, recently worn, and average cost per wear.
  - P2 first slice: show category and color distribution bars.
  - P2 first slice: show up to five items not worn in 30+ days or never worn.
  - P2 first slice: show price overview with total investment, missing prices, highest price, average price, and category spend.
- Optional fields:
  - Brand.
  - Size.
  - Purchase date.
  - Purchase price.
  - P2 first slice: brand, size, purchase date, purchase channel, and purchase price can be stored, searched, viewed, and exported.

### P2 Non-goals

- Full recommendation engine.
- Complex weather integration.
- Marketplace or resale features.

## P3 - Smart And Shareable

Goal: add intelligence and optional sharing while keeping the core app private and open source friendly.

### Features

- AI-assisted classification:
  - Suggest category.
  - Suggest color.
  - Suggest season.
  - Suggest tags.
- Background removal or cleaner item previews.
- Outfit suggestions:
  - Suggest matching items by color, category, season, and history.
  - Allow user feedback: like, dislike, save.
  - P3 first slice: show rule-based outfit suggestions from item detail using category recipes, season compatibility, and neutral colors.
- Import/export:
  - Export wardrobe metadata as JSON or CSV.
  - Export images as a zip.
  - Import backup.
  - P0/P2 first slice: JSON export/import is available for local backup.
  - P3 first slice: CSV export is available for items, outfits, and wear logs in one spreadsheet-friendly file.
  - P3 first slice: image ZIP export is available with a manifest mapping files back to wardrobe items.
  - P3 hardening: storage, CSV escaping, ZIP structure, and outfit suggestion rules have unit tests.
- Optional cloud mode:
  - User accounts.
  - Sync across devices.
  - Object storage for photos.
  - Cloud mode must stay optional so the open source app can run without a database.
  - First slice: app storage is routed through a `WardrobeStore` boundary, with local storage as the default implementation.
  - First slice: Cloudflare D1/R2 architecture and binding examples are documented.
- Web app installability:
  - P3 first slice: provide a web app manifest, app icon, and service worker for installable mobile web usage.
- Sharing:
  - Share selected outfit as an image.
  - Public share link for an outfit if cloud mode exists.
  - P3 first slice: export a selected outfit as a local PNG share card from the outfit detail page.

### P3 Non-goals

- Social network feed.
- Shopping recommendations as a core feature.
- Mandatory cloud login.

## Suggested Information Architecture

- `/` - Today / home
- `/wardrobe` - all clothing items
- `/wardrobe/new` - add clothing item
- `/wardrobe/:id` - clothing detail
- `/outfits` - saved outfits
- `/outfits/new` - create outfit
- `/outfits/:id` - outfit detail
- `/calendar` - wear history
- `/settings` - categories, tags, import/export

## Mobile UI Structure

### Bottom Navigation

- Wardrobe
- Outfits
- Add
- Calendar
- Settings

For P0, only Wardrobe, Add, and Settings need to be active.

### Wardrobe Screen

- Top search bar.
- Horizontal filter chips.
- Two-column image grid.
- Floating add button or centered Add tab.

### Add Item Screen

- Large upload area.
- Preview image after upload.
- Form fields below preview.
- Sticky save button at bottom.

### Detail Screen

- Full-width image at top.
- Compact metadata rows.
- Purchase price if available.
- Edit and delete actions.
- Related outfits section from P1 onward.

## Initial Data Model

### ClothingItem

- `id`
- `name`
- `imageUrl`
- `category`
- `season`
- `primaryColor`
- `tags`
- `notes`
- `brand`
- `size`
- `purchaseDate`
- `purchasePrice`
- `createdAt`
- `updatedAt`

Derived relationships:

- Related saved outfits are found by querying `Outfit.itemIds` for the current clothing item id.
- Suggested related outfits are generated later from category, season, color, tags, and wear history.

### Outfit

- `id`
- `name`
- `itemIds`
- `scenarioTags`
- `notes`
- `createdAt`
- `updatedAt`

### WearLog

- `id`
- `date`
- `itemIds`
- `outfitId`
- `notes`
- `createdAt`

## Tech Direction

Recommended first implementation:

- Frontend: React + Vite + TypeScript.
- Styling: CSS modules or Tailwind CSS.
- State/data: local database first.
- Storage for P0:
  - Browser IndexedDB for metadata and images, or
  - Local backend with SQLite and file uploads.

For an open source project, the simplest complete route is:

- P0 web-only local version:
  - React + Vite + TypeScript.
  - IndexedDB via Dexie.
  - No backend required.

This keeps setup very simple and avoids accounts, servers, and upload infrastructure at the start.

## Open Source Plan

- Use an MIT license unless there is a reason to choose otherwise.
- Keep secrets and paid AI integrations out of P0.
- Provide a seed/demo mode with sample placeholder items.
- Add issue templates later:
  - Bug report.
  - Feature request.
  - Design feedback.
- Add `CONTRIBUTING.md` before inviting outside contributors.

## Recommended Build Order

1. Scaffold React + Vite + TypeScript app.
2. Add mobile app shell and bottom navigation.
3. Add IndexedDB schema.
4. Build add clothing item flow.
5. Build wardrobe grid.
6. Add detail, edit, and delete.
7. Add filters and search.
8. Add README, license, and screenshots.
9. Start P1 outfit builder.
