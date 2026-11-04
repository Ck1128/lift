/**
 * Food groups for the Nutrition view. A food is put in a group by the USDA's own food-group code plus a few plain
 * words in its name. A food that fits no group here is simply not counted in any group. Nothing is guessed.
 */
export type FoodGroup = 'vegetables' | 'fruit' | 'whole_grains' | 'healthy_oils' | 'nuts_legumes' | 'red_meat' | 'processed_meat' | 'alcohol' | 'fish'

export const GROUP_LABEL: Record<FoodGroup, string> = {
  vegetables: 'Vegetables', fruit: 'Fruit', whole_grains: 'Whole grains', healthy_oils: 'Healthy oils', nuts_legumes: 'Nuts and legumes',
  red_meat: 'Red meat', processed_meat: 'Processed meat', alcohol: 'Alcohol', fish: 'Fish and seafood',
}

const PROCESSED = /\b(bacon|ham|sausage|salami|bologna|frankfurter|hot dog|pepperoni|jerky|luncheon|corned|cured|pastrami|bratwurst|knockwurst|liverwurst|chorizo|spam|pate|deli|cold cut|lunch meat|mortadella|prosciutto|canned meat)\b/i
const OIL_GOOD = /^oil, (olive|canola|rapeseed|avocado|sesame|sunflower|safflower|soybean|flaxseed|walnut|peanut|corn|almond|grapeseed|rice bran)/i
const OIL_BAD = /hydrogenated|shortening|lard|butter|margarine|palm|coconut|tallow|spread|dressing|mayonnaise|lecithin/i
const WHOLE = /\b(whole[- ]?(grain|wheat|meal)|brown rice|rice, brown|rice, wild|wild rice|oats?|oatmeal|bulgur|barley|quinoa|buckwheat|millet|amaranth|sorghum|teff|popcorn|ragi|kamut|spelt|farro)\b/i
const NOT_WHOLE = /\b(refined|enriched|unenriched|degermed|pearled|sweetened|presweetened|frosted|honey|raisins?|candy|cookies?|cake|pastry|doughnut|croissant|danish|brownie|pie|malt|flavors|variety|cinnamon|maple|sugar|fruit and cream|banana bread|apples?|peaches|strawberr\w+)\b|oat bran/i
const ALCOHOL = /\b(alcoholic|beer|wine|liqueur|hard cider|malt liquor)\b/i

/** usdaGroup is the 4 digit USDA food-group code. */
export function classifyFood(usdaGroup: string, name: string): FoodGroup | undefined {
  const n = name.toLowerCase()
  if (usdaGroup === '1400') return ALCOHOL.test(n) && !/non-?alcoholic|alcohol free/.test(n) ? 'alcohol' : undefined
  if (usdaGroup === '0700' || ((usdaGroup === '1000' || usdaGroup === '1300' || usdaGroup === '1700' || usdaGroup === '0500') && PROCESSED.test(n) && !/\bfresh\b/.test(n))) return 'processed_meat'
  if (usdaGroup === '1000' || usdaGroup === '1300' || usdaGroup === '1700') return 'red_meat'
  if (usdaGroup === '1500') return /\b(salmon|sardine|mackerel|herring|trout|anchov|albacore|bluefin|whitefish|shad|swordfish|tuna)\b/.test(n) && !/salad|breaded|nuggets|sticks|cake|loaf|patties/.test(n) ? 'fish' : undefined
  if (usdaGroup === '1100') return /(?<!sweet )potato|\b(french fr|fries|chips|catsup|ketchup|hash brown)\b|\bfried\b/.test(n) ? undefined : 'vegetables'
  if (usdaGroup === '0900') {
    if (/avocado/.test(n)) return 'healthy_oils'
    return /\b(juice|nectar|drink|cocktail|syrup|sauce|jam|jelly|preserves|candied|pie|fried)\b/.test(n) ? undefined : 'fruit'
  }
  if (usdaGroup === '1200' || usdaGroup === '1600') return /\b(oil|sauce|chocolate|candied|candy|milk|soymilk|nog|beverage|yogurt|cheese|spread|butter|flour|prosage|patty|patties|burgers?|soyburgers?|choplets|falafel|okara|formulated|links|analog|miso|protein concentrate|protein isolate)\b|protein (concentrate|isolate)/.test(n) ? undefined : 'nuts_legumes'
  if (usdaGroup === '0400') return OIL_GOOD.test(n) && !OIL_BAD.test(n) ? 'healthy_oils' : undefined
  if (usdaGroup === '2000' || usdaGroup === '0800' || usdaGroup === '1800') return (usdaGroup === '1800' ? /\bwhole[- ]?(grain|wheat|meal)\b/i : WHOLE).test(n) && !NOT_WHOLE.test(n) ? 'whole_grains' : undefined
  return undefined
}
