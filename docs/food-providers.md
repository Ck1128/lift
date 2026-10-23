# Food data providers

- **Local catalog** (`src/data/foods.ts`): bundled, offline, always on. Raw and cooked foods are separate entries because calories per gram differ.
- **Open Food Facts** (`src/food/providers.ts`): optional, **off by default**. When on, your search words are sent to openfoodfacts.org. Results are cached in `foodCache` and expire; offline, timeout and rate-limit responses fall back to the cache and local catalog with a plain message.
- **Manual entry**: always available; marked approximate.

Providers share one interface, so another can be added without touching screens. Calorie values are estimates and are shown as such. Open Food Facts data is community-contributed under the Open Database Licence.
