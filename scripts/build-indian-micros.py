#!/usr/bin/env python3
"""
Gives plain Indian foods (ingredients, not dishes) their sodium, sugars, fibre and saturated fat from the USDA record of
the same food. Each pairing is written by hand below and is kept only when the bundled food's calories and macros are
close to the USDA record's (a different variety of the same food, so not identical). Dishes are never paired.
Run: python3 scripts/build-indian-micros.py   (reads src/data/usdaFoods.ts and src/data/indianFoods.ts)
"""
import re, json
usda = {l.split('|')[2]: l.split('|') for l in open('src/data/usdaFoods.ts').read().split('`')[1].strip().split('\n')}
ind = open('src/data/indianFoods.ts').read().split('TABLE = `')[1].split('`')[0]
rows = [l.split('|') for l in ind.split('\n') if l and not l.startswith('#')]

P = lambda n: f'{n}, mature seeds, raw'
C = lambda n: f'{n}, mature seeds, cooked, boiled, without salt'
M = {
 'toor-dal': {'raw': P('Pigeon peas (red gram)'), 'cooked': C('Pigeon peas (red gram)')},
 'moong-dal': {'raw': P('Mung beans'), 'cooked': C('Mung beans')},
 'moong-whole': {'raw': P('Mung beans'), 'cooked': C('Mung beans')},
 'chana-dal': {'raw': P('Chickpeas (garbanzo beans, bengal gram)'), 'cooked': C('Chickpeas (garbanzo beans, bengal gram)')},
 'kabuli-chana': {'raw': P('Chickpeas (garbanzo beans, bengal gram)'), 'cooked': C('Chickpeas (garbanzo beans, bengal gram)')},
 'kala-chana': {'raw': P('Chickpeas (garbanzo beans, bengal gram)'), 'cooked': C('Chickpeas (garbanzo beans, bengal gram)')},
 'masoor-dal': {'raw': 'Lentils, raw', 'cooked': 'Lentils, mature seeds, cooked, boiled, without salt'},
 'black-eyed': {'raw': 'Cowpeas, common (blackeyes, crowder, southern), mature seeds, raw', 'cooked': 'Cowpeas, common (blackeyes, crowder, southern), mature seeds, cooked, boiled, without salt'},
 'rajma-raw': {'raw': 'Beans, kidney, all types, mature seeds, raw', 'cooked': 'Beans, kidney, red, mature seeds, cooked, boiled, without salt'},
 'moth-beans': {'raw': 'Mothbeans, mature seeds, raw'},
 'soybean': {'raw': 'Soybeans, mature seeds, raw'},
 'tofu': {'ready': 'Tofu, raw, firm, prepared with calcium sulfate'},
 'besan': {'ready': 'Chickpea flour (besan)'},
 'sesame': {'ready': 'Seeds, sesame seeds, whole, dried'},
 'flax': {'ready': 'Seeds, flaxseed'},
 'coconut-fresh': {'ready': 'Nuts, coconut meat, raw'},
 'coconut-dry': {'ready': 'Nuts, coconut meat, dried (desiccated), not sweetened'},
 'coconut-water': {'ready': 'Nuts, coconut water (liquid from coconuts)'},
 'peanuts-raw': {'ready': 'Peanuts, all types, raw'},
 'peanuts-roasted': {'ready': 'Peanuts, all types, dry-roasted, without salt'},
 'cashew-in': {'ready': 'Nuts, cashew nuts, raw'}, 'almond-in': {'ready': 'Nuts, almonds'}, 'pista': {'ready': 'Nuts, pistachio nuts, raw'}, 'walnut-in': {'ready': 'Nuts, walnuts, english'},
 'pumpkin-seeds': {'ready': 'Seeds, pumpkin and squash seed kernels, dried'}, 'sunflower-seeds': {'ready': 'Seeds, sunflower seed kernels, dried'}, 'chia-seeds': {'ready': 'Seeds, chia seeds, dried'},
 'bottle-gourd': {'raw': 'Gourd, white-flowered (calabash), raw'}, 'ridge-gourd': {'raw': 'Gourd, dishcloth (towelgourd), raw'}, 'bitter-gourd': {'raw': 'Balsam-pear (bitter gourd), pods, raw'},
 'ash-gourd': {'raw': 'Waxgourd, (chinese preserving melon), raw'}, 'pumpkin': {'raw': 'Pumpkin, raw'}, 'brinjal': {'raw': 'Eggplant, raw'}, 'okra': {'raw': 'Okra, raw'},
 'drumstick': {'raw': 'Drumstick pods, raw'}, 'tomato-indian': {'raw': 'Tomatoes, red, ripe, raw, year round average'}, 'onion-red': {'raw': 'Onions, raw'}, 'onion-white': {'raw': 'Onions, raw'},
 'potato-indian': {'raw': 'Potatoes, flesh and skin, raw'}, 'sweet-potato-in': {'raw': 'Sweet potato, raw, unprepared'}, 'carrot-in': {'raw': 'Carrots, raw'}, 'beetroot': {'raw': 'Beets, raw'},
 'cabbage': {'raw': 'Cabbage, raw'}, 'cauliflower-in': {'raw': 'Cauliflower, raw'}, 'green-peas': {'raw': 'Peas, green, raw'}, 'french-beans': {'raw': 'Beans, snap, green, raw'},
 'capsicum': {'raw': 'Peppers, sweet, green, raw'}, 'green-chilli': {'raw': 'Peppers, hot chili, green, raw'}, 'cucumber-in': {'raw': 'Cucumber, with peel, raw'},
 'yam': {'raw': 'Yam, raw'}, 'colocasia': {'raw': 'Taro, raw'}, 'tapioca': {'raw': 'Cassava, raw'}, 'radish': {'raw': 'Radishes, raw'}, 'turnip': {'raw': 'Turnips, raw'},
 'mushroom-in': {'raw': 'Mushrooms, white, raw'}, 'garlic': {'raw': 'Garlic, raw'}, 'garlic-raw': {'raw': 'Garlic, raw'}, 'ginger': {'raw': 'Ginger root, raw'},
 'spring-onion': {'raw': 'Onions, spring or scallions (includes tops and bulb), raw'}, 'coriander-leaves': {'raw': 'Coriander (cilantro) leaves, raw'}, 'lemon-in': {'raw': 'Lemons, raw, without peel'},
 'broccoli': {'raw': 'Broccoli, raw'}, 'zucchini': {'raw': 'Squash, summer, zucchini, includes skin, raw'}, 'lettuce': {'raw': 'Lettuce, cos or romaine, raw'}, 'kohlrabi': {'raw': 'Kohlrabi, raw'},
 'spinach-in': {'raw': 'Spinach, raw'}, 'thotakura': {'raw': 'Amaranth leaves, raw'}, 'mustard-greens': {'raw': 'Mustard greens, raw'}, 'munaga-aaku': {'raw': 'Drumstick leaves, raw'},
 'mango-in': {'ready': 'Mangos, raw'}, 'banana-in': {'ready': 'Bananas, raw'}, 'papaya': {'ready': 'Papayas, raw'}, 'guava': {'ready': 'Guavas, common, raw'}, 'pomegranate': {'ready': 'Pomegranates, raw'},
 'grapes-in': {'ready': 'Grapes, red or green (European type, such as Thompson seedless), raw'}, 'watermelon': {'ready': 'Watermelon, raw'}, 'muskmelon': {'ready': 'Melons, cantaloupe, raw'},
 'pineapple-in': {'ready': 'Pineapple, raw, all varieties'}, 'orange-in': {'ready': 'Oranges, raw, all commercial varieties'}, 'apple-in': {'ready': 'Apples, raw, with skin'},
 'custard-apple': {'ready': 'Custard-apple, (bullock\'s-heart), raw'}, 'jackfruit': {'ready': 'Jackfruit, raw'}, 'fig': {'ready': 'Figs, raw'}, 'jamun': {'ready': 'Java-plum, (jambolan), raw'},
 'tamarind': {'ready': 'Tamarinds, raw'}, 'lychee': {'ready': 'Litchis, raw'}, 'kiwi-in': {'ready': 'Kiwifruit, green, raw'}, 'raisins': {'ready': 'Raisins, seedless'},
 'pear': {'raw': 'Pears, raw'}, 'plum': {'raw': 'Plums, raw'}, 'peach': {'raw': 'Peaches, yellow, raw'}, 'cherry': {'raw': 'Cherries, sweet, raw'}, 'strawberry': {'raw': 'Strawberries, raw'},
 'blueberry': {'raw': 'Blueberries, raw'}, 'avocado': {'raw': 'Avocados, raw, all commercial varieties'}, 'dried-apricot': {'ready': 'Apricots, dried, sulfured, uncooked'}, 'prunes': {'ready': 'Plums, dried (prunes), uncooked'},
 'jowar': {'raw': 'Sorghum grain'}, 'bajra': {'raw': 'Millet, raw'}, 'wheat-flour': {'ready': 'Wheat flour, whole-grain'}, 'maida': {'ready': 'Wheat flour, white, all-purpose, enriched, bleached'},
 'semolina': {'raw': 'Semolina, enriched'}, 'oats-indian': {'raw': 'Cereals, oats, regular and quick, not fortified, dry'}, 'maize': {'cooked': 'Corn, sweet, yellow, cooked, boiled, drained, without salt'},
 'rice-raw': {'raw': 'Rice, white, long-grain, regular, raw, enriched', 'cooked': 'Rice, white, long-grain, regular, enriched, cooked'},
 'rice-parboiled': {'raw': 'Rice, white, long-grain, parboiled, enriched, dry', 'cooked': 'Rice, white, long-grain, parboiled, enriched, cooked'},
 'egg-raw': {'raw': 'Egg, whole, raw, fresh'}, 'egg-white': {'ready': 'Egg, white, raw, fresh'},
 'milk-cow-in': {'ready': 'Milk, whole, 3.25% milkfat, with added vitamin D'}, 'curd': {'ready': 'Yogurt, plain, whole milk, 8 grams protein per 8 ounce'},
 'butter-in': {'ready': 'Butter, without salt'}, 'sugar-in': {'ready': 'Sugars, granulated'}, 'honey-in': {'ready': 'Honey'}, 'salt-in': {'ready': 'Salt, table'},
 'turmeric': {'ready': 'Spices, turmeric, ground'}, 'cumin': {'ready': 'Spices, cumin seed'}, 'mustard-seeds': {'ready': 'Spices, mustard seed, ground'}, 'coriander-seeds': {'ready': 'Spices, coriander seed'},
 'mustard-oil': {'ready': 'Oil, mustard'},
}
def f(x): return float(x) if x != '' else None
def close(a, b, rel, floor): return abs(a - b) <= max(floor, rel * abs(b))
out, bad, missing = [], [], []
for r in rows:
    fid, state = r[0], r[10]
    name = M.get(fid, {}).get(state)
    if not name: continue
    u = usda.get(name)
    if not u: missing.append((fid, name)); continue
    k, p, c, fa = float(r[5]), float(r[6]), float(r[7]), float(r[8])
    uk, up, uc, uf = float(u[4]), f(u[5]), f(u[6]), f(u[7])
    ok = close(k, uk, .15, 20) and close(p, up, .3, 3) and close(c, uc, .2, 5) and close(fa, uf, .35, 3)
    if not ok: bad.append((fid, state, [k, p, c, fa], u[4:8], name)); continue
    out.append((f'{fid}|{state}', [u[0], u[1], name, u[8], u[9], u[10], u[11]]))
print(len(out), 'paired;', len(bad), 'rejected;', len(missing), 'not in USDA')
for b in bad: print('  rejected', b)
for m in missing: print('  missing', m)
lines = ["// Generated by scripts/build-indian-micros.py. Plain Indian foods paired by hand with the USDA record of the same food;",
         "// a pairing is kept only when calories and macros are close. Dishes are never paired.",
         "// [USDA id, USDA food group, USDA name, fibre g, sugars g, sodium mg, saturated fat g] per 100 g.",
         "export const INDIAN_MICROS: Record<string, [string, string, string, string, string, string, string]> = {"]
lines += [f"  {json.dumps(k)}: {json.dumps(v)}," for k, v in out] + ['}']
open('src/data/indianMicros.ts', 'w').write('\n'.join(lines) + '\n')
