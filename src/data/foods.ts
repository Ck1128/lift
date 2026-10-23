import type { FoodItem, FoodState, PrepState, SizedUnit } from '../engine/food'

/**
 * A small bundled list of common foods that works with no network.
 * Values are per 100 g (or 100 ml) and are rounded reference values in the style of USDA FoodData Central
 * (public domain). Foods marked `approximate` are typical values, not a lab record.
 * These are estimates. Brands, recipes and ripeness all change the real numbers.
 * Raw and cooked versions are separate records on purpose: never mix them up.
 */
export const LOCAL_FOODS_VERSION = 'foods-1'
const SRC = 'Bundled common foods (USDA FoodData Central reference values, rounded)'
const SRC_APPROX = 'Bundled common foods (typical values, approximate)'

type Macros = [number, number, number]
const S = (
  state: PrepState, kcal: number, macros: Macros | null, unitSize: Partial<Record<SizedUnit, number>>, label?: string, gramsPerMl?: number,
): FoodState => ({
  state, basis: 'g', kcalPer100: kcal, unitSize, label, gramsPerMl,
  ...(macros ? { proteinPer100: macros[0], carbsPer100: macros[1], fatPer100: macros[2] } : {}),
})

const F = (id: string, name: string, states: FoodState[], aliases: string[] = [], approximate = false): FoodItem => ({
  provider: 'local', providerId: id, name, aliases, states, kind: 'generic', source: approximate ? SRC_APPROX : SRC, approximate: approximate || undefined,
})

export const LOCAL_FOODS: FoodItem[] = [
  // ---- grains and starches (dry and cooked differ a lot) ----
  F('rice-white', 'Rice, white', [
    S('raw', 365, [7.1, 80, 0.7], { cup: 185, serving: 45 }, 'dry / raw'),
    S('cooked', 130, [2.7, 28.2, 0.3], { cup: 158, serving: 158 }, 'cooked'),
  ], ['rice', 'chawal']),
  F('rice-brown', 'Rice, brown', [
    S('raw', 370, [7.9, 77.2, 2.9], { cup: 185, serving: 45 }, 'dry / raw'),
    S('cooked', 123, [2.7, 25.6, 1], { cup: 195, serving: 195 }, 'cooked'),
  ], ['rice']),
  F('rice-basmati', 'Rice, basmati', [
    S('raw', 350, [8, 78, 0.6], { cup: 185, serving: 45 }, 'dry / raw'),
    S('cooked', 130, [3, 28, 0.3], { cup: 160, serving: 160 }, 'cooked'),
  ], ['rice', 'basmati', 'chawal'], true),
  F('pasta', 'Pasta (wheat)', [
    S('raw', 371, [13, 74.7, 1.5], { serving: 56 }, 'dry / raw'),
    S('cooked', 158, [5.8, 30.9, 0.9], { cup: 140, serving: 140 }, 'cooked'),
  ], ['spaghetti', 'macaroni', 'noodles']),
  F('oats', 'Oats, rolled', [
    S('raw', 379, [13.2, 67.7, 6.5], { cup: 81, serving: 40 }, 'dry / raw'),
    S('cooked', 71, [2.5, 12, 1.5], { cup: 234, serving: 234 }, 'cooked with water'),
  ], ['oatmeal', 'porridge']),
  F('quinoa', 'Quinoa', [
    S('raw', 368, [14.1, 64.2, 6.1], { cup: 170, serving: 45 }, 'dry / raw'),
    S('cooked', 120, [4.4, 21.3, 1.9], { cup: 185, serving: 185 }, 'cooked'),
  ]),
  F('potato', 'Potato', [
    S('raw', 77, [2, 17.5, 0.1], { piece: 173 }, 'raw'),
    S('cooked', 87, [1.9, 20.1, 0.1], { piece: 173, cup: 156 }, 'boiled, no skin'),
  ], ['aloo']),
  F('sweet-potato', 'Sweet potato', [
    S('raw', 86, [1.6, 20.1, 0.1], { piece: 130 }, 'raw'),
    S('cooked', 90, [2, 20.7, 0.2], { piece: 114 }, 'baked in skin'),
  ]),
  F('bread-white', 'Bread, white', [S('ready', 265, [9, 49, 3.2], { piece: 25, serving: 25 }, 'slice')], ['toast']),
  F('bread-wholewheat', 'Bread, whole wheat', [S('ready', 252, [12.5, 42.7, 3.6], { piece: 28, serving: 28 }, 'slice')], ['toast']),
  F('roti', 'Roti / chapati (whole wheat)', [S('ready', 297, [11, 51, 4], { piece: 40 }, 'cooked, medium')], ['chapati', 'phulka'], true),

  // ---- legumes ----
  F('lentils', 'Lentils', [
    S('raw', 352, [24.6, 63.4, 1.1], { cup: 192 }, 'dry / raw'),
    S('cooked', 116, [9, 20.1, 0.4], { cup: 198 }, 'boiled'),
  ], ['dal', 'daal']),
  F('chickpeas', 'Chickpeas', [
    S('raw', 378, [20.5, 62.9, 6], { cup: 200 }, 'dry / raw'),
    S('cooked', 164, [8.9, 27.4, 2.6], { cup: 164 }, 'boiled'),
  ], ['garbanzo', 'chana']),
  F('black-beans', 'Black beans', [
    S('raw', 341, [21.6, 62.4, 1.4], { cup: 194 }, 'dry / raw'),
    S('cooked', 132, [8.9, 23.7, 0.5], { cup: 172 }, 'boiled'),
  ]),
  F('kidney-beans', 'Kidney beans', [
    S('raw', 333, [23.6, 60, 0.8], { cup: 184 }, 'dry / raw'),
    S('cooked', 127, [8.7, 22.8, 0.5], { cup: 177 }, 'boiled'),
  ], ['rajma']),
  F('tofu', 'Tofu, firm', [S('ready', 144, [17.3, 2.8, 8.7], { serving: 126 }, 'firm, raw block')]),

  // ---- meat, fish, eggs ----
  F('chicken-breast', 'Chicken breast, skinless', [
    S('raw', 120, [22.5, 0, 2.6], { serving: 113 }, 'raw'),
    S('cooked', 165, [31, 0, 3.6], { serving: 85 }, 'roasted'),
  ]),
  F('chicken-thigh', 'Chicken thigh, skinless', [
    S('raw', 121, [19.7, 0, 4.1], { serving: 113 }, 'raw'),
    S('cooked', 179, [24.8, 0, 8.2], { serving: 85 }, 'roasted'),
  ]),
  F('beef-ground-85', 'Ground beef, 85% lean', [
    S('raw', 215, [18.6, 0, 15], { serving: 113 }, 'raw'),
    S('cooked', 250, [25.9, 0, 15.4], { serving: 85 }, 'pan-browned'),
  ]),
  F('salmon', 'Salmon, Atlantic (farmed)', [
    S('raw', 208, [20.4, 0, 13.4], { serving: 113 }, 'raw'),
    S('cooked', 206, [22.1, 0, 12.4], { serving: 85 }, 'cooked, dry heat'),
  ]),
  F('shrimp', 'Shrimp', [
    S('raw', 85, [20.1, 0, 0.5], { serving: 113 }, 'raw'),
    S('cooked', 99, [24, 0.2, 0.3], { serving: 85 }, 'cooked'),
  ], ['prawn', 'prawns']),
  F('tuna-canned', 'Tuna, canned in water (drained)', [S('ready', 116, [25.5, 0, 0.8], { serving: 85 }, 'canned')]),
  F('egg', 'Egg, whole', [
    S('raw', 143, [12.6, 0.7, 9.5], { piece: 50 }, 'raw'),
    S('cooked', 155, [12.6, 1.1, 10.6], { piece: 50 }, 'hard-boiled'),
  ], ['eggs']),

  // ---- dairy ----
  F('milk-whole', 'Milk, whole', [S('ready', 61, [3.2, 4.8, 3.3], { cup: 244, tbsp: 15.3 }, 'liquid', 1.03)], ['milk', 'doodh']),
  F('milk-skim', 'Milk, skim', [S('ready', 34, [3.4, 5, 0.1], { cup: 245, tbsp: 15.3 }, 'liquid', 1.03)], ['milk', 'nonfat milk']),
  F('yogurt-greek-nonfat', 'Greek yogurt, plain, nonfat', [S('ready', 59, [10.2, 3.6, 0.4], { cup: 245, serving: 170 }, 'plain')], ['yogurt', 'yoghurt', 'curd']),
  F('yogurt-greek-whole', 'Greek yogurt, plain, whole milk', [S('ready', 97, [9, 3.9, 5], { cup: 245, serving: 170 }, 'plain')], ['yogurt', 'yoghurt', 'curd']),
  F('yogurt-plain', 'Yogurt, plain, whole milk', [S('ready', 61, [3.5, 4.7, 3.3], { cup: 245, serving: 170 }, 'plain')], ['yogurt', 'yoghurt', 'curd', 'dahi']),
  F('cottage-cheese', 'Cottage cheese, 2%', [S('ready', 81, [10.4, 4.8, 2.3], { cup: 226 }, '2% fat')]),
  F('cheddar', 'Cheddar cheese', [S('ready', 403, [24.9, 1.3, 33.1], { piece: 28, serving: 28, cup: 113 }, 'slice (28 g)')], ['cheese']),
  F('paneer', 'Paneer', [S('ready', 290, null, { serving: 100 }, 'typical')], ['cottage cheese indian'], true),
  F('butter', 'Butter', [S('ready', 717, [0.9, 0.1, 81.1], { tbsp: 14.2, tsp: 4.7 }, 'salted')]),
  F('ghee', 'Ghee', [S('ready', 876, [0.3, 0, 99.5], { tbsp: 12.8, tsp: 4.3 }, 'clarified butter')]),

  // ---- fats, nuts, sweet ----
  F('olive-oil', 'Olive oil', [S('ready', 884, [0, 0, 100], { tbsp: 13.5, tsp: 4.5 }, 'oil', 0.92)], ['oil']),
  F('peanut-butter', 'Peanut butter, smooth', [S('ready', 588, [25, 20, 50], { tbsp: 16, tsp: 5.3 }, 'smooth')]),
  F('almonds', 'Almonds', [S('ready', 579, [21.2, 21.6, 49.9], { cup: 143, serving: 28 }, 'raw')], ['nuts']),
  F('walnuts', 'Walnuts', [S('ready', 654, [15.2, 13.7, 65.2], { cup: 117, serving: 28 }, 'raw')], ['nuts']),
  F('cashews', 'Cashews', [S('ready', 553, [18.2, 30.2, 43.9], { cup: 137, serving: 28 }, 'raw')], ['nuts']),
  F('honey', 'Honey', [S('ready', 304, [0.3, 82.4, 0], { tbsp: 21, tsp: 7 }, 'honey')]),
  F('sugar', 'Sugar, white', [S('ready', 387, [0, 100, 0], { tbsp: 12.6, tsp: 4.2 }, 'granulated')]),
  F('dark-chocolate', 'Dark chocolate, 70-85% cocoa', [S('ready', 598, [7.8, 45.9, 42.6], { serving: 28 }, 'bar')], ['chocolate']),
  F('hummus', 'Hummus', [S('ready', 166, [7.9, 14.3, 9.6], { tbsp: 15, serving: 30 }, 'commercial')]),

  // ---- vegetables ----
  F('broccoli', 'Broccoli', [
    S('raw', 34, [2.8, 6.6, 0.4], { cup: 91 }, 'raw'),
    S('cooked', 35, [2.4, 7.2, 0.4], { cup: 156 }, 'boiled'),
  ]),
  F('spinach', 'Spinach', [
    S('raw', 23, [2.9, 3.6, 0.4], { cup: 30 }, 'raw'),
    S('cooked', 23, [3, 3.8, 0.3], { cup: 180 }, 'boiled'),
  ], ['palak']),
  F('carrot', 'Carrot', [
    S('raw', 41, [0.9, 9.6, 0.2], { piece: 61, cup: 128 }, 'raw'),
    S('cooked', 35, [0.8, 8.2, 0.2], { cup: 156 }, 'boiled'),
  ]),
  F('cauliflower', 'Cauliflower', [
    S('raw', 25, [1.9, 5, 0.3], { cup: 107 }, 'raw'),
    S('cooked', 23, [1.8, 4.1, 0.5], { cup: 124 }, 'boiled'),
  ], ['gobi']),
  F('green-beans', 'Green beans', [
    S('raw', 31, [1.8, 7, 0.2], { cup: 110 }, 'raw'),
    S('cooked', 35, [1.9, 7.9, 0.3], { cup: 125 }, 'boiled'),
  ]),
  F('onion', 'Onion', [S('raw', 40, [1.1, 9.3, 0.1], { piece: 110, cup: 160 }, 'raw')]),
  F('tomato', 'Tomato', [S('raw', 18, [0.9, 3.9, 0.2], { piece: 123, cup: 180 }, 'raw')]),
  F('cucumber', 'Cucumber', [S('raw', 15, [0.7, 3.6, 0.1], { cup: 104 }, 'raw')]),
  F('bell-pepper', 'Bell pepper, red', [S('raw', 31, [1, 6, 0.3], { piece: 119, cup: 149 }, 'raw')]),
  F('mushrooms', 'Mushrooms, white', [S('raw', 22, [3.1, 3.3, 0.3], { cup: 70 }, 'raw')]),
  F('avocado', 'Avocado', [S('raw', 160, [2, 8.5, 14.7], { piece: 136, cup: 150 }, 'flesh only')]),

  // ---- fruit ----
  F('banana', 'Banana', [S('ready', 89, [1.1, 22.8, 0.3], { piece: 118 }, 'peeled, medium')]),
  F('apple', 'Apple', [S('ready', 52, [0.3, 13.8, 0.2], { piece: 182, cup: 125 }, 'with skin, medium')]),
  F('orange', 'Orange', [S('ready', 47, [0.9, 11.8, 0.1], { piece: 131 }, 'medium')]),
  F('grapes', 'Grapes', [S('ready', 69, [0.7, 18.1, 0.2], { cup: 151 }, 'raw')]),
  F('mango', 'Mango', [S('ready', 60, [0.8, 15, 0.4], { cup: 165, piece: 336 }, 'raw, flesh')]),
  F('strawberries', 'Strawberries', [S('ready', 32, [0.7, 7.7, 0.3], { cup: 152 }, 'raw')]),
  F('blueberries', 'Blueberries', [S('ready', 57, [0.7, 14.5, 0.3], { cup: 148 }, 'raw')]),

  // ---- drinks and supplements ----
  F('orange-juice', 'Orange juice', [S('ready', 45, [0.7, 10.4, 0.2], { cup: 248 }, 'juice', 1.04)], ['juice']),
  F('cola', 'Cola (regular)', [S('ready', 42, [0, 10.6, 0], { cup: 240 }, 'soft drink', 1)], ['soda', 'coke']),
  F('whey-protein', 'Whey protein powder (typical)', [S('ready', 400, [78, 8, 6], { serving: 30 }, 'powder, 1 scoop')], ['protein powder'], true),
]

export const LOCAL_FOOD_COUNT = LOCAL_FOODS.length
