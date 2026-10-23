import type { FoodItem, FoodState, PrepState, SizedUnit } from '../engine/food'

/**
 * Indian foods that work with no network, with Telugu names you can search by (Telugu script or English letters).
 * Values are per 100 g, rounded, typical figures for home-style Indian cooking. They are estimates:
 * recipes, oil and portion sizes vary a lot, so every food here is marked approximate.
 * Written from general food-composition knowledge; no table was copied from any book or website.
 *
 * One food per line, fields separated by "|":
 *   id | English name | Telugu (letters) | Telugu (script) | other names | kcal | protein | carbs | fat | unit:grams | state
 * Lines with the same id become the raw / cooked versions of one food.
 */
export const INDIAN_FOODS_VERSION = 'indian-2'
const SRC = 'Bundled Indian foods (typical home-style values, approximate)'

const TABLE = `
# ---- rice and grains ----
rice-raw|Rice, raw (dry)|biyyam|బియ్యం|chawal,sona masoori,ponni|356|7|79|0.5|cup:185|raw
rice-raw|Rice, raw (dry)|biyyam|బియ్యం|chawal,sona masoori,ponni|130|2.7|28|0.3|cup:160|cooked
rice-parboiled|Rice, parboiled (dry)|uppudu biyyam|ఉప్పుడు బియ్యం|boiled rice,idli rice|350|7.5|77|0.6|cup:190|raw
rice-parboiled|Rice, parboiled (dry)|uppudu biyyam|ఉప్పుడు బియ్యం|boiled rice,idli rice|125|2.8|27|0.3|cup:160|cooked
wheat-flour|Wheat flour (atta)|godhuma pindi|గోధుమ పిండి|atta,maida,whole wheat flour|341|12|71|1.7|cup:120|ready
maida|Refined flour (maida)|maida pindi|మైదా పిండి|all purpose flour|348|11|74|1|cup:125|ready
jowar|Sorghum (jowar), whole|jonna|జొన్న|jonnalu,jowar,sorghum|349|10.4|72.6|1.9|cup:160|raw
jowar-flour|Jowar flour|jonna pindi|జొన్న పిండి|jowar atta|349|10.4|72.6|1.9|cup:130|ready
bajra|Pearl millet (bajra)|sajja|సజ్జ|sajjalu,bajra|361|11.6|67.5|5|cup:165|raw
ragi|Finger millet (ragi)|ragi|రాగి|ragulu,nachni,ragi flour|328|7.3|72|1.3|cup:120|raw
korra|Foxtail millet|korralu|కొర్రలు|kangni,thinai,navane|331|12.3|60.9|4.3|cup:180|raw
samalu|Little millet|samalu|సామలు|kutki,saamai|341|7.7|67|4.7|cup:180|raw
udalu|Barnyard millet|udalu|ఊదలు|sanwa,kuthiraivali|307|11.2|65.5|3.6|cup:180|raw
arikelu|Kodo millet|arikelu|అరికెలు|varagu,kodra|353|8.3|65.9|1.4|cup:180|raw
andu-korra|Browntop millet|andu korralu|అండు కొర్రలు|browntop|320|11|62|3.5|cup:180|raw
maize|Corn, sweet (boiled)|mokkajonna|మొక్కజొన్న|bhutta,sweet corn,makka|96|3.4|21|1.5|cup:150|cooked
cornflour|Corn flour|mokkajonna pindi|మొక్కజొన్న పిండి|makki atta,corn starch|355|7|75|3.5|cup:120|ready
poha|Rice flakes (poha)|atukulu|అటుకులు|aval,flattened rice|346|6.6|77|1.2|cup:50|raw
semolina|Semolina (rava / suji)|bombay ravva|బొంబాయి రవ్వ|rava,sooji,upma rava|348|10.4|74|0.8|cup:170|raw
vermicelli|Vermicelli (semiya)|semiya|సేమియా|sevai,seviyan|352|10|75|1|cup:100|raw
sabudana|Sago (sabudana)|saggubiyyam|సగ్గుబియ్యం|tapioca pearls,javvarisi|351|0.2|87|0.2|cup:150|raw
oats-indian|Oats, instant (plain)|oats|ఓట్స్|oatmeal|379|13|67|6.5|cup:80|raw

# ---- dals and pulses ----
toor-dal|Toor dal (pigeon pea, split)|kandipappu|కందిపప్పు|tur dal,arhar,red gram|335|22|62|1.7|cup:200|raw
toor-dal|Toor dal (pigeon pea, split)|kandipappu|కందిపప్పు|tur dal,arhar,red gram|116|6.8|20|0.5|cup:200|cooked
moong-dal|Moong dal (split green gram)|pesarapappu|పెసరపప్పు|mung,yellow moong|347|24|59|1.2|cup:200|raw
moong-dal|Moong dal (split green gram)|pesarapappu|పెసరపప్పు|mung,yellow moong|105|7|19|0.4|cup:200|cooked
moong-whole|Green gram, whole (moong)|pesalu|పెసలు|green moong,mung beans|334|24|56|1.2|cup:200|raw
moong-whole|Green gram, whole (moong)|pesalu|పెసలు|green moong,mung beans|105|7|19|0.4|cup:200|cooked
chana-dal|Chana dal (split Bengal gram)|senagapappu|శనగపప్పు|bengal gram dal|360|21|60|5.3|cup:200|raw
chana-dal|Chana dal (split Bengal gram)|senagapappu|శనగపప్పు|bengal gram dal|130|8|21|2|cup:200|cooked
kabuli-chana|Chickpeas, white (kabuli chana)|senagalu|శనగలు|chole,chana,garbanzo|364|19|61|6|cup:200|raw
kabuli-chana|Chickpeas, white (kabuli chana)|senagalu|శనగలు|chole,chana,garbanzo|164|8.9|27|2.6|cup:164|cooked
kala-chana|Black chickpeas (kala chana)|nalla senagalu|నల్ల శనగలు|desi chana,bengal gram|360|19|61|5|cup:200|raw
kala-chana|Black chickpeas (kala chana)|nalla senagalu|నల్ల శనగలు|desi chana,bengal gram|150|8.5|24|2.5|cup:165|cooked
urad-dal|Urad dal (split black gram)|minapappu|మినపప్పు|black gram,ulundu|347|24|59|1.4|cup:200|raw
urad-dal|Urad dal (split black gram)|minapappu|మినపప్పు|black gram,ulundu|110|7.5|18|0.5|cup:200|cooked
urad-whole|Black gram, whole (urad)|minumulu|మినుములు|kaali dal,sabut urad|347|24|59|1.4|cup:200|raw
masoor-dal|Masoor dal (red lentils)|erra kandipappu|ఎర్ర కందిపప్పు|red lentil,masur|343|25|59|0.7|cup:200|raw
masoor-dal|Masoor dal (red lentils)|erra kandipappu|ఎర్ర కందిపప్పు|red lentil,masur|116|9|20|0.4|cup:198|cooked
horse-gram|Horse gram|ulavalu|ఉలవలు|kulthi,kollu|321|22|57|0.5|cup:200|raw
horse-gram|Horse gram|ulavalu|ఉలవలు|kulthi,kollu|130|9|22|0.5|cup:180|cooked
black-eyed|Black-eyed peas|alasandalu|అలసందలు|lobia,chawli,cowpea|323|24|54|1|cup:200|raw
black-eyed|Black-eyed peas|alasandalu|అలసందలు|lobia,chawli,cowpea|116|7.7|21|0.5|cup:170|cooked
rajma-raw|Rajma (red kidney beans)|rajma|రాజ్మా|kidney beans|346|22.9|60.6|1.3|cup:184|raw
rajma-raw|Rajma (red kidney beans)|rajma|రాజ్మా|kidney beans|127|8.7|22.8|0.5|cup:177|cooked
green-peas-dry|Dried green peas (matar)|batani|బఠానీలు|vatana,dry peas|315|20|56|1.4|cup:200|raw
soya-chunks|Soya chunks (nutrela)|soya chunks|సోయా చంక్స్|meal maker,soy nuggets|345|52|33|0.5|cup:40|raw
soya-chunks|Soya chunks (nutrela)|soya chunks|సోయా చంక్స్|meal maker,soy nuggets|115|17|11|0.4|cup:150|cooked
sprouts-moong|Moong sprouts|mulakettina pesalu|మొలకెత్తిన పెసలు|sprouts,mulakalu|62|6|9|0.4|cup:100|ready
peanuts-raw|Peanuts (groundnuts)|verusenaga|వేరుశనగ|palli,pallilu,groundnut,moongphali|567|25.8|16|49|cup:146|ready
peanuts-roasted|Peanuts, roasted|vepina verusenaga|వేయించిన వేరుశనగ|roasted palli|585|24|21|49|cup:146|ready
roasted-chana|Roasted chana (putnalu)|putnalu|పుట్నాలు|bhuna chana,fried gram,dalia|369|22|58|5.3|cup:150|ready
besan|Gram flour (besan)|senagapindi|శనగపిండి|besan,chickpea flour|387|22|58|6.7|cup:90|ready
sesame|Sesame seeds (til)|nuvvulu|నువ్వులు|til,gingelly|573|18|23|50|tbsp:9|ready
flax|Flax seeds (alsi)|avise ginjalu|అవిసె గింజలు|alsi,linseed|534|18|29|42|tbsp:10|ready
coconut-fresh|Coconut, fresh|kobbari|కొబ్బరి|nariyal,kobbari kaya|354|3.3|15|33|piece:45|ready
coconut-dry|Coconut, dry (copra)|endu kobbari|ఎండు కొబ్బరి|dry coconut,dessicated|660|6.9|24|62|tbsp:8|ready
coconut-water|Tender coconut water|kobbari bondam neellu|కొబ్బరి బొండం నీళ్లు|nariyal pani,elaneer|19|0.7|3.7|0.2|cup:240|ready
coconut-malai|Tender coconut flesh|kobbari bondam malai|లేత కొబ్బరి|malai|110|1.5|6|9|serving:100|ready

# ---- vegetables ----
bottle-gourd|Bottle gourd (squash)|sorakaya|సొరకాయ|lauki,dudhi,anapakaya,opo squash|14|0.2|2.5|0.1|cup:116|raw
ridge-gourd|Ridge gourd|beerakaya|బీరకాయ|turai,tori,luffa|20|0.5|3.4|0.1|cup:100|raw
snake-gourd|Snake gourd|potlakaya|పొట్లకాయ|chichinda,padwal|18|0.5|3.3|0.3|cup:100|raw
bitter-gourd|Bitter gourd|kakarakaya|కాకరకాయ|karela,bitter melon|25|1.6|4.2|0.2|cup:100|raw
ash-gourd|Ash gourd|boodida gummadikaya|బూడిద గుమ్మడికాయ|petha,white pumpkin,winter melon|10|0.4|1.9|0.1|cup:100|raw
pumpkin|Pumpkin|gummadikaya|గుమ్మడికాయ|kaddu,sitaphal|25|1.4|4.6|0.1|cup:116|raw
ivy-gourd|Ivy gourd (tindora)|dondakaya|దొండకాయ|tindora,kundru,tondli|18|1.2|3.1|0.1|cup:100|raw
brinjal|Brinjal (eggplant)|vankaya|వంకాయ|baingan,aubergine,eggplant|24|1.4|4|0.3|cup:100|raw
okra|Okra (ladies finger)|bendakaya|బెండకాయ|bhindi,lady finger|33|1.9|7.5|0.2|cup:100|raw
drumstick|Drumstick (moringa pods)|munagakaya|మునగకాయ|saijan,sahjan,moringa|26|2.5|3.7|0.1|piece:50|raw
tomato-indian|Tomato, desi|tamata|టమాటా|tamatar|20|0.9|3.6|0.2|piece:100|raw
onion-red|Onion, red|ullipaya|ఉల్లిపాయ|pyaz,kanda,eerulli|50|1.2|11.1|0.1|piece:110|raw
potato-indian|Potato|bangaladumpa|బంగాళదుంప|aloo,batata|97|1.6|22.6|0.1|piece:150|raw
sweet-potato-in|Sweet potato|chilagadadumpa|చిలగడదుంప|shakarkandi,genasu|120|1.2|28|0.3|piece:130|raw
carrot-in|Carrot|carrot|క్యారెట్|gajar|48|0.9|10.6|0.2|piece:61|raw
beetroot|Beetroot|beetroot|బీట్‌రూట్|chukandar|43|1.7|9.6|0.2|piece:80|raw
cabbage|Cabbage|cabbage|క్యాబేజీ|patta gobi,band gobi|27|1.8|4.6|0.1|cup:90|raw
cauliflower-in|Cauliflower|cauliflower|కాలీఫ్లవర్|gobi,phool gobi|30|2.6|4.9|0.4|cup:107|raw
green-peas|Green peas (fresh)|batani|బఠానీలు|matar,peas|93|7.2|16|0.1|cup:145|raw
cluster-beans|Cluster beans|goruchikkudu|గోరుచిక్కుడు|gawar,guar|16|3.2|10.8|0.4|cup:100|raw
broad-beans|Broad beans (field beans)|chikkudu|చిక్కుడు|sem,avarekai,papdi|48|4.5|6.7|0.1|cup:100|raw
french-beans|French beans|beans|బీన్స్|farasbi,green beans|26|1.7|4.5|0.1|cup:100|raw
capsicum|Capsicum (green)|bengaluru mirapakaya|బెంగళూరు మిరపకాయ|shimla mirch,bell pepper,capsicum|24|1.3|4.3|0.3|piece:120|raw
green-chilli|Green chilli|pachi mirapakaya|పచ్చి మిరపకాయ|hari mirch,mirchi|29|2.9|3|0.6|piece:5|raw
cucumber-in|Cucumber|dosakaya|దోసకాయ|kheera,kakdi|13|0.4|2.5|0.1|cup:104|raw
raw-banana|Raw banana (plantain)|aratikaya|అరటికాయ|kachha kela,plantain|116|1.4|28|0.3|piece:150|raw
raw-mango|Raw mango|mamidikaya|మామిడికాయ|kaccha aam,kairi|51|0.7|11.8|0.2|piece:200|raw
yam|Elephant foot yam|kanda|కంద|suran,jimikand|79|2|18.4|0.1|cup:100|raw
colocasia|Colocasia (taro root)|chamadumpa|చామదుంప|arbi,chamagadda|97|3|21|0.2|cup:100|raw
tapioca|Tapioca (cassava)|karrapendalam|కర్రపెండలం|kappa,sabudana root,yuca|157|0.7|38|0.2|cup:100|raw
radish|Radish (white)|mullangi|ముల్లంగి|mooli|17|0.6|3.4|0.1|cup:100|raw
turnip|Turnip|turnip|టర్నిప్|shalgam|29|1.5|6.2|0.2|cup:100|raw
mushroom-in|Mushroom|pattagodugulu|పుట్టగొడుగులు|kukka godugu,khumb|22|3.1|3.3|0.3|cup:70|raw
banana-flower|Banana flower|arati puvvu|అరటి పువ్వు|kela phool|34|1.7|6.6|0.6|cup:100|raw
banana-stem|Banana stem|arati dutta|అరటి దూట|kela tana|30|0.5|6.6|0.1|cup:100|raw
garlic|Garlic|vellulli|వెల్లుల్లి|lahsun,lasun|149|6.4|33|0.5|tsp:3|raw
ginger|Ginger, fresh|allam|అల్లం|adrak|80|1.8|18|0.8|tsp:2|raw
spring-onion|Spring onion|ullikadalu|ఉల్లికాడలు|hare pyaz,scallion|32|1.8|7.3|0.2|cup:100|raw
curry-leaves|Curry leaves|karivepaku|కరివేపాకు|kadi patta|108|6.1|18.7|1|tsp:1|raw
coriander-leaves|Coriander leaves|kothimeera|కొత్తిమీర|dhania patta,cilantro|23|2.1|3.7|0.5|tbsp:4|raw
mint|Mint leaves|pudina|పుదీనా|pudhina|44|3.3|8.4|0.7|tbsp:3|raw
lemon-in|Lemon / lime|nimmakaya|నిమ్మకాయ|nimbu,nimma pandu|30|0.6|10.7|0.1|piece:50|raw
lotus-stem|Lotus stem|tamara dumpa|తామర దుంప|kamal kakdi,nadru|74|2.6|17|0.1|cup:100|raw

# ---- leafy greens ----
spinach-in|Spinach|palakura|పాలకూర|palak,pachali koora|26|2|2.9|0.7|cup:30|raw
gongura|Gongura (roselle leaves)|gongura|గోంగూర|pulicha keerai,ambadi,sorrel leaves|56|1.7|10|1.1|cup:30|raw
thotakura|Amaranth leaves|thotakura|తోటకూర|chaulai,harive soppu|45|4|6.3|0.5|cup:30|raw
menthi-kura|Fenugreek leaves (methi)|menthikura|మెంతికూర|methi,fenugreek greens|49|4.4|6|0.9|cup:30|raw
chukka-kura|Sorrel leaves|chukkakura|చుక్కకూర|chukka,khatta palak|28|2|4|0.5|cup:30|raw
munaga-aaku|Drumstick leaves|munagaaku|మునగాకు|moringa leaves,saijan patta|92|6.7|12.5|1.7|cup:21|raw
mustard-greens|Mustard greens (sarson)|aava aaku|ఆవ ఆకు|sarson ka saag|34|4|4|0.6|cup:56|raw
ponnaganti|Ponnaganti kura|ponnaganti kura|పొన్నగంటి కూర|dwarf copperleaf|40|3|6|0.5|cup:30|raw
bachali-kura|Malabar spinach|bachali kura|బచ్చలి కూర|poi,basale|19|1.8|3.4|0.3|cup:30|raw

# ---- fruits ----
mango-in|Mango (ripe)|mamidi pandu|మామిడి పండు|aam,mamidipandu|74|0.6|17|0.4|cup:165|ready
banana-in|Banana, ripe|arati pandu|అరటి పండు|kela,chakkarakeli|116|1.2|27|0.3|piece:118|ready
papaya|Papaya|boppayi|బొప్పాయి|papita|32|0.6|7.2|0.1|cup:145|ready
guava|Guava|jama pandu|జామ పండు|amrood,peru|51|0.9|11.2|0.3|piece:100|ready
pomegranate|Pomegranate|danimma|దానిమ్మ|anar|83|1.7|19|1.2|cup:174|ready
grapes-in|Grapes|draksha|ద్రాక్ష|angoor|71|0.5|16.5|0.2|cup:151|ready
watermelon|Watermelon|puchakaya|పుచ్చకాయ|tarbooz|16|0.6|3.4|0.2|cup:152|ready
muskmelon|Muskmelon|kharbuja|ఖర్బూజ|kharbooja,cantaloupe|17|0.3|3.5|0.2|cup:160|ready
pineapple-in|Pineapple|anasa pandu|అనాస పండు|ananas|46|0.4|10.8|0.1|cup:165|ready
orange-in|Orange|narinja|నారింజ|santra,narangi|48|0.7|10.9|0.2|piece:131|ready
sweet-lime|Sweet lime (mosambi)|battayi|బత్తాయి|mosambi,sathukudi|43|0.8|9.3|0.3|piece:150|ready
apple-in|Apple|apple|ఆపిల్|seb|59|0.2|13.4|0.5|piece:182|ready
sapota|Sapota (chikoo)|sapota|సపోటా|chikoo,chiku|98|0.7|21.4|1.1|piece:100|ready
custard-apple|Custard apple|seethaphalam|సీతాఫలం|sitaphal,sharifa|104|1.6|23.5|0.5|piece:150|ready
jackfruit|Jackfruit, ripe|panasa pandu|పనస పండు|kathal,pala|88|1.9|19|0.3|cup:165|ready
jackfruit-raw|Jackfruit, raw (curry)|panasa kaya|పనస కాయ|kathal,raw jackfruit|51|2.6|9.4|0.3|cup:150|raw
dates|Dates, dried|kharjuram|ఖర్జూరం|khajur,dried dates|283|2.5|75|0.4|piece:8|ready
fig|Fig, fresh|anjeer|అంజీర్|anjir,athi pandu|74|0.8|19|0.3|piece:50|ready
jamun|Jamun (black plum)|neredu pandu|నేరేడు పండు|jambul,java plum|62|0.7|14|0.2|cup:100|ready
amla|Amla (Indian gooseberry)|usirikaya|ఉసిరికాయ|usiri,amalaki|44|0.9|10|0.6|piece:20|ready
tamarind|Tamarind pulp|chintapandu|చింతపండు|imli|239|2.8|62.5|0.6|tbsp:15|ready
wood-apple|Wood apple|velaga pandu|వెలగ పండు|bel,kaith|134|7|20|3.7|piece:100|ready
lychee|Lychee|lychee|లీచీ|litchi|66|0.8|16.5|0.4|cup:190|ready
kiwi-in|Kiwi|kiwi|కివి|kiwi fruit|61|1.1|14.7|0.5|piece:75|ready
raisins|Raisins|endu draksha|ఎండు ద్రాక్ష|kishmish,munakka|299|3.1|79|0.5|tbsp:10|ready
cashew-in|Cashew nuts|jeedipappu|జీడిపప్పు|kaju|553|18.2|30|44|piece:2|ready
almond-in|Almonds|badam|బాదం|badam pappu|579|21.2|21.6|49.9|piece:1.2|ready
pista|Pistachios|pista|పిస్తా|pista pappu|562|20|28|45|piece:0.8|ready
walnut-in|Walnuts|akrotu|అక్రోటు|akhrot|654|15.2|13.7|65|piece:5|ready
makhana|Makhana (fox nuts)|makhana|మఖానా|phool makhana,lotus seeds|347|9.7|77|0.1|cup:30|ready

# ---- breakfast and tiffins ----
idli|Idli|idli|ఇడ్లీ|idly|140|4|28|0.9|piece:40|ready
dosa|Dosa, plain|dosa|దోశ|dosai,plain dosa|168|3.9|29|3.7|piece:85|ready
masala-dosa|Masala dosa|masala dosa|మసాలా దోశ|potato dosa|190|4|27|7.5|piece:160|ready
rava-dosa|Rava dosa|rava dosa|రవ్వ దోశ|sooji dosa|200|4.5|30|7|piece:90|ready
ghee-roast|Ghee roast dosa|neyyi dosa|నెయ్యి దోశ|ghee dosa,paper roast|230|4|30|10|piece:90|ready
set-dosa|Set dosa|set dosa|సెట్ దోశ|sponge dosa|165|4|30|2.5|piece:70|ready
pesarattu|Pesarattu (green gram dosa)|pesarattu|పెసరట్టు|moong dosa,green dosa|160|7|24|3.8|piece:90|ready
upma-pesarattu|Upma pesarattu|upma pesarattu|ఉప్మా పెసరట్టు|upma dosa|175|6|25|5|piece:150|ready
uttapam|Uttapam|uthappam|ఊతప్పం|oothappam,uttappa|170|5|27|4.5|piece:110|ready
medu-vada|Medu vada|garelu|గారెలు|vada,medu vadai,ulundu vada|260|8|28|13|piece:45|ready
aava-vada|Aavadalu / sorrel vada|aavadalu|ఆవడలు|dahi vada,perugu vada|180|7|20|8|piece:60|ready
dahi-vada|Dahi vada|perugu garelu|పెరుగు గారెలు|dahi bhalla|150|6|18|6|piece:80|ready
upma|Upma|upma|ఉప్మా|uppittu|150|3.2|22|5.5|cup:200|ready
poha-dish|Poha (cooked)|atukula upma|అటుకుల ఉప్మా|aval upma,kanda poha|130|2.5|23|3.5|cup:150|ready
pongal|Ven pongal|pongal|పొంగల్|khara pongal,ghee pongal|150|4|22|5|cup:200|ready
sweet-pongal|Sakkarai pongal|sakkara pongali|చక్కెర పొంగలి|sweet pongal,chakkara pongal|210|3.5|38|5|cup:150|ready
idiyappam|Idiyappam (string hoppers)|idiyappam|ఇడియప్పం|sevai,noolputtu|150|3|33|0.5|piece:40|ready
appam|Appam|appam|అప్పం|palappam|150|2.5|30|1.5|piece:60|ready
puttu|Puttu|puttu|పుట్టు|rice puttu|160|3|34|1|cup:120|ready
dhokla|Dhokla|dhokla|ఢోక్లా|khaman|160|6|24|4.5|piece:40|ready
besan-chilla|Besan chilla|senagapindi dosa|శనగపిండి దోశ|chilla,pudla|180|8|22|6|piece:80|ready
sabudana-khichdi|Sabudana khichdi|saggubiyyam khichdi|సగ్గుబియ్యం కిచిడి|sago khichdi|180|2|30|6|cup:150|ready
paratha|Paratha, plain|paratha|పరోటా|parotta|300|7|42|11|piece:70|ready
aloo-paratha|Aloo paratha|aloo paratha|ఆలూ పరోటా|potato paratha|250|5|36|9.5|piece:100|ready
paneer-paratha|Paneer paratha|paneer paratha|పనీర్ పరోటా|paneer stuffed paratha|270|9|32|12|piece:100|ready
methi-thepla|Methi thepla|menthi thepla|మెంతి తెప్ల|thepla|320|9|45|11|piece:45|ready
roti-in|Chapati / roti|chapati|చపాతీ|roti,phulka,rotti|297|11|51|4|piece:40|ready
puri|Puri|poori|పూరీ|poori|350|7|45|16|piece:30|ready
bhatura|Bhatura|bhature|భటూరా|bature|330|8|46|12|piece:80|ready
naan|Naan|naan|నాన్|butter naan|290|9|50|5.5|piece:90|ready
rumali|Rumali roti|rumali roti|రుమాలీ రోటీ|handkerchief roti|265|8|52|2|piece:40|ready
jowar-roti|Jowar roti|jonna rotte|జొన్న రొట్టె|jolada rotti,bhakri|230|7|45|1.5|piece:60|ready
ragi-mudde|Ragi mudde (ragi sangati)|ragi sangati|రాగి సంగటి|ragi ball,ragi mudde|118|2.5|25|0.7|piece:150|ready
ragi-roti|Ragi roti|ragi rotte|రాగి రొట్టె|ragi dosa|210|5|42|1.5|piece:70|ready
bajra-roti|Bajra roti|sajja rotte|సజ్జ రొట్టె|bajre ki roti|250|7|45|3.5|piece:60|ready
chapati-ghee|Chapati with ghee|neyyi chapati|నెయ్యి చపాతీ|ghee roti|330|9|47|11|piece:45|ready
bread-slice-in|Bread, white (slice)|bread|బ్రెడ్|double roti,pav|265|9|49|3.2|piece:25|ready
pav|Pav (bread roll)|pav|పావ్|ladi pav|290|8|50|6|piece:40|ready
masala-omelette|Masala omelette|masala omelette|మసాలా ఆమ్లెట్|egg omelette|180|11|3|14|piece:100|ready
egg-bhurji|Egg bhurji|egg pulusu bhurji|గుడ్డు బుర్జీ|anda bhurji,scrambled egg|190|12|4|14|cup:120|ready
boiled-egg|Boiled egg|ubakabetti guddu|ఉడికించిన గుడ్డు|kodi guddu,anda|155|12.6|1.1|10.6|piece:50|ready

# ---- rice dishes ----
curd-rice|Curd rice|perugannam|పెరుగన్నం|daddojanam,thayir sadam|120|3.5|17|3.8|cup:200|ready
lemon-rice|Lemon rice|nimmakaya pulihora|నిమ్మకాయ పులిహోర|chitrannam|150|3|25|4|cup:180|ready
pulihora|Tamarind rice (pulihora)|pulihora|పులిహోర|puliyogare,puliyodarai|170|3|28|5|cup:180|ready
tomato-rice|Tomato rice|tamata annam|టమాటా అన్నం|tomato bath|150|3|25|4.5|cup:180|ready
coconut-rice|Coconut rice|kobbari annam|కొబ్బరి అన్నం|thengai sadam|180|3|26|7|cup:180|ready
jeera-rice|Jeera rice|jeera annam|జీరా అన్నం|cumin rice|150|2.8|27|3.5|cup:180|ready
veg-pulao|Veg pulao|veg pulao|వెజ్ పులావ్|pulav|150|3|25|4|cup:200|ready
veg-biryani|Veg biryani|veg biryani|వెజ్ బిర్యానీ|vegetable biryani|150|3.5|24|4.5|cup:220|ready
chicken-biryani|Chicken biryani|chicken biryani|చికెన్ బిర్యానీ|hyderabadi chicken dum biryani|180|9|22|6|cup:250|ready
mutton-biryani|Mutton biryani|mutton biryani|మటన్ బిర్యానీ|goat biryani|200|9|22|8|cup:250|ready
egg-biryani|Egg biryani|egg biryani|ఎగ్ బిర్యానీ|anda biryani|170|7|24|5.5|cup:230|ready
prawn-biryani|Prawn biryani|royyala biryani|రొయ్యల బిర్యానీ|shrimp biryani|170|8|23|5|cup:230|ready
khichdi|Khichdi (dal and rice)|pappu annam khichdi|కిచిడి|moong dal khichdi|120|4.5|19|2.8|cup:220|ready
bisi-bele|Bisi bele bath|bisi bele bhath|బిసి బేళే బాత్|sambar rice|150|4|23|4.5|cup:220|ready
sambar-rice|Sambar rice|sambar annam|సాంబార్ అన్నం|sambar sadam|140|4|24|3|cup:220|ready
fried-rice-veg|Veg fried rice|veg fried rice|వెజ్ ఫ్రైడ్ రైస్|fried rice|165|3.5|27|5|cup:200|ready
chicken-fried-rice|Chicken fried rice|chicken fried rice|చికెన్ ఫ్రైడ్ రైస్|egg fried rice|180|7|26|5.5|cup:220|ready
ghee-rice|Ghee rice (neyyi annam)|neyyi annam|నెయ్యి అన్నం|ghee rice|180|3|28|6|cup:180|ready
pudina-rice|Mint rice (pudina)|pudina annam|పుదీనా అన్నం|mint pulao|150|3|25|4|cup:180|ready
gongura-rice|Gongura rice|gongura annam|గోంగూర అన్నం|gongura pulao|170|3|26|6|cup:180|ready

# ---- dals, curries and gravies (vegetarian) ----
dal-tadka|Dal tadka|pappu|పప్పు|dal fry,tadka dal,toor dal|110|6|14|3.5|cup:200|ready
dal-makhani|Dal makhani|dal makhani|దాల్ మఖనీ|black dal|140|6|14|6.5|cup:200|ready
tomato-pappu|Tomato pappu|tamata pappu|టమాటా పప్పు|tomato dal|95|5|13|2.8|cup:200|ready
palakura-pappu|Palak pappu|palakura pappu|పాలకూర పప్పు|palak dal,spinach dal|95|5.5|12|2.8|cup:200|ready
mamidikaya-pappu|Mango dal (mamidikaya pappu)|mamidikaya pappu|మామిడికాయ పప్పు|raw mango dal|100|5|14|3|cup:200|ready
dosakaya-pappu|Dosakaya pappu|dosakaya pappu|దోసకాయ పప్పు|cucumber dal|90|5|12|2.8|cup:200|ready
sorakaya-pappu|Bottle gourd dal|sorakaya pappu|సొరకాయ పప్పు|lauki dal|80|4.5|11|2.3|cup:200|ready
gongura-pappu|Gongura pappu|gongura pappu|గోంగూర పప్పు|sorrel dal|100|5|13|3|cup:200|ready
sambar|Sambar|sambar|సాంబార్|sambhar|60|3|8|1.8|cup:200|ready
rasam|Rasam|charu|చారు|rasam,pepper rasam,saaru|25|1|4|0.7|cup:200|ready
ulava-charu|Ulava charu (horse gram soup)|ulavacharu|ఉలవచారు|kollu rasam|75|4.5|11|1.2|cup:200|ready
majjiga-pulusu|Majjiga pulusu|majjiga pulusu|మజ్జిగ పులుసు|mor kuzhambu,kadhi|75|3|8|3.5|cup:200|ready
kadhi|Punjabi kadhi pakora|kadhi|కడీ|kadhi pakora|110|4|11|5.5|cup:200|ready
chana-masala|Chole / chana masala|senagala kura|శనగల కూర|chole,chana curry|150|6.5|19|5|cup:200|ready
rajma-masala|Rajma masala|rajma kura|రాజ్మా కూర|rajma curry|130|6|17|4|cup:200|ready
paneer-butter|Paneer butter masala|paneer butter masala|పనీర్ బటర్ మసాలా|paneer makhani|230|9|9|18|cup:200|ready
palak-paneer|Palak paneer|palakura paneer|పాలకూర పనీర్|saag paneer|170|8|6|13|cup:200|ready
matar-paneer|Matar paneer|batani paneer|బఠానీ పనీర్|peas paneer|190|8|9|13|cup:200|ready
kadai-paneer|Kadai paneer|kadai paneer|కడాయి పనీర్|paneer kadai|200|9|8|15|cup:200|ready
paneer-tikka|Paneer tikka|paneer tikka|పనీర్ టిక్కా|tandoori paneer|250|13|7|19|piece:30|ready
paneer-bhurji|Paneer bhurji|paneer bhurji|పనీర్ బుర్జీ|scrambled paneer|230|13|6|17|cup:150|ready
paneer-cube|Paneer, plain|paneer|పనీర్|cottage cheese,chenna|290|18|3.4|22|piece:25|ready
aloo-gobi|Aloo gobi|bangaladumpa cauliflower kura|ఆలూ గోబీ|potato cauliflower curry|100|2.5|12|4.5|cup:150|ready
aloo-curry|Potato curry (aloo fry)|bangaladumpa kura|బంగాళదుంప కూర|aloo sabzi,aloo fry|130|2|18|6|cup:150|ready
aloo-jeera|Jeera aloo|jeera aloo|జీరా ఆలూ|cumin potato|140|2|19|6.5|cup:150|ready
bhindi-fry|Bhendi fry|bendakaya fry|బెండకాయ ఫ్రై|bhindi masala,okra fry|120|2.5|9|8|cup:100|ready
bendakaya-pulusu|Bendakaya pulusu|bendakaya pulusu|బెండకాయ పులుసు|okra tamarind curry|85|2|10|4|cup:150|ready
vankaya-kura|Brinjal curry|vankaya kura|వంకాయ కూర|baingan masala|110|2|9|7.5|cup:150|ready
gutti-vankaya|Gutti vankaya (stuffed brinjal)|gutti vankaya|గుత్తి వంకాయ|bharwan baingan|140|3|10|10|piece:70|ready
bagara-baingan|Bagara baingan|bagara baingan|బగారా బైంగన్|brinjal peanut curry|150|3.5|11|10.5|cup:150|ready
baingan-bharta|Baingan bharta|vankaya kura mashed|వంకాయ బర్తా|roasted brinjal mash|90|2|9|5|cup:150|ready
dondakaya-fry|Dondakaya fry|dondakaya fry|దొండకాయ ఫ్రై|tindora fry|110|2|10|7|cup:100|ready
beerakaya-kura|Ridge gourd curry|beerakaya kura|బీరకాయ కూర|turai sabzi|70|2|6|4.5|cup:150|ready
sorakaya-kura|Bottle gourd curry|sorakaya kura|సొరకాయ కూర|lauki sabzi|60|1.5|6|3.5|cup:150|ready
potlakaya-kura|Snake gourd curry|potlakaya kura|పొట్లకాయ కూర|snake gourd poriyal|65|2|6|4|cup:150|ready
kakarakaya-fry|Bitter gourd fry|kakarakaya fry|కాకరకాయ ఫ్రై|karela fry|120|2.5|9|8|cup:100|ready
cabbage-fry|Cabbage fry (poriyal)|cabbage kura|క్యాబేజీ కూర|cabbage sabzi,patta gobi|75|2.5|7|4.5|cup:100|ready
beans-fry|Beans fry|beans kura|బీన్స్ కూర|french beans poriyal|85|2.5|8|5|cup:100|ready
carrot-beans|Carrot beans curry|carrot beans kura|క్యారెట్ బీన్స్ కూర|mixed veg|80|2|10|4|cup:100|ready
mixed-veg-curry|Mixed vegetable curry|mixed veg kura|మిక్స్డ్ వెజ్ కూర|sabzi,veg curry|90|2.5|10|4.5|cup:150|ready
kootu|Kootu (dal with vegetables)|kootu|కూటు|dalma|85|4|11|3|cup:200|ready
avial|Avial|avial|అవియల్|aviyal|110|2.5|8|8|cup:150|ready
gongura-pachadi|Gongura pachadi|gongura pachadi|గోంగూర పచ్చడి|gongura chutney|120|2|8|9|tbsp:15|ready
tomato-pachadi|Tomato pachadi|tamata pachadi|టమాటా పచ్చడి|tomato chutney|90|1.5|9|5.5|tbsp:15|ready
coconut-chutney|Coconut chutney|kobbari pachadi|కొబ్బరి పచ్చడి|nariyal chutney|180|2.5|8|16|tbsp:15|ready
peanut-chutney|Peanut chutney|palli pachadi|పల్లీ పచ్చడి|verusenaga chutney|300|10|12|24|tbsp:15|ready
pudina-chutney|Mint chutney|pudina pachadi|పుదీనా పచ్చడి|green chutney|70|2|8|3.5|tbsp:15|ready
allam-pachadi|Ginger chutney|allam pachadi|అల్లం పచ్చడి|allam chutney|110|2|15|5|tbsp:15|ready
avakaya|Avakaya (mango pickle)|avakaya|ఆవకాయ|mango pickle,aam ka achar|250|2|9|23|tsp:8|ready
pickle-lime|Lemon pickle|nimmakaya pachadi|నిమ్మకాయ ఊరగాయ|nimbu achar|150|1.5|10|12|tsp:8|ready
podi|Idli podi (gunpowder)|kandi podi|కారం పొడి|gun powder,milagai podi,karam podi|440|20|40|22|tsp:5|ready
raita|Raita (cucumber)|perugu pachadi|పెరుగు పచ్చడి|dahi raita,boondi raita|60|3|5|3|cup:150|ready
papad|Papad (roasted)|appadam|అప్పడం|papadum,pappad|371|20|56|2|piece:10|ready
papad-fried|Papad (fried)|vepina appadam|వేయించిన అప్పడం|fried papadum|480|18|50|23|piece:12|ready

# ---- non-vegetarian ----
chicken-curry|Chicken curry|kodi kura|కోడి కూర|chicken gravy,andhra chicken curry|150|14|4|8.5|cup:200|ready
chicken-fry-andhra|Andhra chicken fry|kodi vepudu|కోడి వేపుడు|chicken fry,chicken roast|230|22|5|13|cup:150|ready
chicken-65|Chicken 65|chicken 65|చికెన్ 65|chicken sixty five|250|19|10|15|piece:30|ready
butter-chicken|Butter chicken|butter chicken|బటర్ చికెన్|murgh makhani|190|13|7|12|cup:200|ready
chicken-tikka|Chicken tikka|chicken tikka|చికెన్ టిక్కా|tikka|150|24|3|4.5|piece:30|ready
tandoori-chicken|Tandoori chicken|tandoori chicken|తందూరి చికెన్|tandoori|150|22|3|5.5|piece:120|ready
chicken-keema|Chicken keema|chicken keema|చికెన్ కీమా|minced chicken|180|18|4|10|cup:150|ready
kodi-pulusu|Natu kodi pulusu (country chicken)|natu kodi pulusu|నాటు కోడి పులుసు|country chicken curry|160|16|4|9|cup:200|ready
chicken-lollipop|Chicken lollipop|chicken lollipop|చికెన్ లాలీపాప్|chicken wings fried|260|18|10|16|piece:50|ready
mutton-curry|Mutton curry|mutton kura|మటన్ కూర|goat curry,gosht,mamsam|190|16|4|12|cup:200|ready
mutton-fry|Mutton fry (vepudu)|mutton vepudu|మటన్ వేపుడు|goat fry|260|22|4|17|cup:150|ready
mutton-keema|Mutton keema|mutton keema|మటన్ కీమా|keema|240|20|5|16|cup:150|ready
fish-curry|Fish curry|chepala pulusu|చేపల పులుసు|chepa pulusu,fish gravy,meen kuzhambu|120|13|3|6|cup:200|ready
fish-fry|Fish fry|chepa vepudu|చేప వేపుడు|fish fry,tawa fish|200|20|5|11|piece:100|ready
fish-grilled|Fish, grilled (no oil)|kalchina chepa|కాల్చిన చేప|tandoori fish|130|23|0|4|piece:100|ready
prawn-curry|Prawn curry|royyala kura|రొయ్యల కూర|royyala iguru,shrimp masala|130|14|5|6|cup:200|ready
prawn-fry|Prawn fry|royyala vepudu|రొయ్యల వేపుడు|prawn masala fry|170|18|5|9|cup:150|ready
crab-curry|Crab curry|peethala kura|పీతల కూర|crab masala|120|14|4|5|cup:200|ready
egg-curry|Egg curry|guddu kura|గుడ్డు కూర|egg masala|140|8|5|10|cup:200|ready
egg-pulusu|Egg pulusu|guddu pulusu|గుడ్డు పులుసు|egg tamarind curry|120|7|6|8|cup:200|ready
egg-fry|Egg fry|guddu vepudu|గుడ్డు వేపుడు|egg masala fry|180|11|3|14|piece:100|ready
chicken-raw|Chicken, with skin (raw)|kodi mamsam|కోడి మాంసం|chicken|215|18.6|0|15.1|serving:100|raw
mutton-raw|Mutton / goat meat (raw)|mamsam|మేక మాంసం|goat,mutton,gosht|109|20.6|0|2.3|serving:100|raw
rohu|Rohu fish (raw)|rohu chepa|రోహు చేప|rohu,freshwater fish|97|16.6|0|1.4|serving:100|raw
pomfret|Pomfret (raw)|chandava|చందవ|pomfret,paplet|105|18|0|3|serving:100|raw
sardine|Sardine / mackerel (raw)|kavallu|కవళ్ళు|bangda,mathi,sardine|120|19|0|4.5|serving:100|raw
dry-fish|Dried fish|endu chepa|ఎండు చేప|karuvadu,sukha bombil|290|60|0|5|serving:30|ready

# ---- street food and snacks ----
samosa|Samosa|samosa|సమోసా|aloo samosa|262|4.5|28|15|piece:60|ready
mirchi-bajji|Mirchi bajji|mirchi bajji|మిర్చి బజ్జీ|chilli bajji|200|5|20|11|piece:50|ready
onion-pakoda|Onion pakoda|ulli pakodi|ఉల్లి పకోడీ|onion bhaji,kanda bhaji,punugulu|300|7|28|18|piece:25|ready
punugulu|Punugulu|punugulu|పునుగులు|idli batter fritters|260|6|30|13|piece:25|ready
aloo-bonda|Aloo bonda|bonda|బోండా|batata vada,bonda|250|4|28|13|piece:50|ready
vada-pav|Vada pav|vada pav|వడా పావ్|bombay burger|290|6|38|12|piece:100|ready
pav-bhaji|Pav bhaji (bhaji only)|pav bhaji|పావ్ భాజీ|bhaji|150|3.5|20|6|cup:200|ready
pani-puri|Pani puri|pani puri|పానీ పూరీ|golgappa,puchka|180|3|30|5|piece:20|ready
bhel-puri|Bhel puri|bhel puri|భేల్ పూరీ|bhel|170|4|28|5|cup:100|ready
dahi-puri|Sev puri / dahi puri|sev puri|సేవ్ పూరీ|chaat|200|4|28|8|piece:30|ready
kachori|Kachori|kachori|కచోరీ|dal kachori|390|8|42|21|piece:60|ready
mixture|Mixture / namkeen|mixture|మిక్చర్|sev mixture,chivda|520|12|45|32|cup:40|ready
murukku|Murukku / chakli|jantikalu|జంతికలు|chakli,chakkalu|480|8|55|25|piece:20|ready
sakinalu|Sakinalu|sakinalu|సకినాలు|rice murukku|470|7|60|22|piece:15|ready
chekkalu|Chekkalu (rice crackers)|chekkalu|చెక్కలు|nippattu,thattai|500|8|50|30|piece:15|ready
sev|Sev (besan)|karapusa|కారప్పూస|karaboondi,sev|540|13|45|34|cup:40|ready
boiled-groundnut|Boiled peanuts|udikinchina palli|ఉడికించిన పల్లీలు|boiled groundnut|318|13|21|22|cup:150|ready
roasted-corn|Roasted corn (bhutta)|kalchina mokkajonna|కాల్చిన మొక్కజొన్న|bhutta|110|3.5|24|1.5|piece:100|ready
masala-corn|Masala sweet corn (cup)|corn masala|కార్న్ మసాలా|sweet corn chaat|130|3.5|22|4|cup:130|ready
chana-chaat|Chana chaat|chaat|శనగల చాట్|sundal,chickpea salad|140|7|20|3.5|cup:120|ready
sundal|Sundal (boiled chickpeas, tempered)|sundal|సుండల్|guggillu|165|8|23|5|cup:120|ready
guggillu|Guggillu (boiled chana with coconut)|guggillu|గుగ్గిళ్ళు|boiled chana|165|8|23|5|cup:120|ready
corn-flakes-in|Cornflakes|corn flakes|కార్న్ ఫ్లేక్స్|cereal|357|7.5|84|0.4|cup:28|ready
rusk|Rusk / toast biscuit|rusk|రస్క్|toast|408|11|73|8|piece:10|ready
marie|Marie biscuit|marie biscuit|మేరీ బిస్కెట్|tea biscuit|430|7.5|76|11|piece:7|ready
parle-g|Glucose biscuit (Parle-G type)|glucose biscuit|గ్లూకోజ్ బిస్కెట్|parle g|450|7|76|13|piece:5|ready
maggi|Instant noodles (cooked, masala)|maggi|మ్యాగీ|noodles,instant noodles|205|4.5|30|7.5|cup:200|ready
veg-momos|Veg momos (steamed)|momos|మోమోస్|dumplings|140|4|25|2.5|piece:25|ready
french-fries-in|French fries|french fries|ఫ్రెంచ్ ఫ్రైస్|chips|312|3.4|41|15|cup:100|ready
potato-chips|Potato chips (packet)|potato chips|బంగాళదుంప చిప్స్|wafers,aloo chips|536|7|53|34|serving:28|ready
chikki|Peanut chikki|palli patti|పల్లీ పట్టి|groundnut chikki,peanut brittle|490|11|60|23|piece:25|ready

# ---- sweets ----
gulab-jamun|Gulab jamun|gulab jamun|గులాబ్ జామున్|jamun|320|5|52|11|piece:40|ready
jalebi|Jalebi|jilebi|జిలేబీ|jalebi|380|3|65|12|piece:40|ready
rasgulla|Rasgulla|rasgulla|రసగుల్లా|rosogolla|186|4|40|1|piece:40|ready
rasmalai|Rasmalai|rasmalai|రసమలై|ras malai|200|7|25|8|piece:50|ready
kheer|Kheer / payasam (rice)|payasam|పాయసం|kheer,payasa|130|3.5|20|4|cup:200|ready
semiya-payasam|Semiya payasam|semiya payasam|సేమియా పాయసం|vermicelli kheer|150|3.5|25|4|cup:200|ready
gajar-halwa|Gajar halwa|carrot halwa|క్యారెట్ హల్వా|gajar ka halwa|200|3.5|27|9|cup:100|ready
sheera|Rava kesari / sheera|rava kesari|రవ్వ కేసరి|suji halwa,sheera|260|3|42|9|cup:100|ready
sooji-laddu|Rava laddu|rava laddu|రవ్వ లడ్డు|suji ladoo|430|5|58|20|piece:35|ready
besan-laddu|Besan laddu|senagapindi laddu|శనగపిండి లడ్డు|besan ladoo|450|9|52|23|piece:40|ready
motichoor|Motichoor laddu|boondi laddu|బూందీ లడ్డు|boondi ladoo,tirupati laddu|430|6|60|19|piece:50|ready
bobbatlu|Bobbatlu (puran poli)|bobbatlu|బొబ్బట్లు|puran poli,holige,obbattu|300|6|52|8|piece:70|ready
ariselu|Ariselu|ariselu|అరిసెలు|adhirasam|400|4|65|15|piece:40|ready
sunnundalu|Sunnundalu (urad laddu)|sunnundalu|సున్నుండలు|urad dal laddu|450|10|55|21|piece:40|ready
palakova|Palakova|palakova|పాలకోవా|doodh peda,khoa sweet|350|9|50|13|piece:25|ready
mysore-pak|Mysore pak|mysore pak|మైసూర్ పాక్|mysore pak|520|5|50|34|piece:30|ready
kaju-katli|Kaju katli|kaju katli|కాజు కత్లీ|kaju barfi|480|9|55|25|piece:20|ready
milk-barfi|Milk barfi|barfi|బర్ఫీ|burfi,peda|400|8|55|16|piece:30|ready
coconut-laddu|Coconut laddu|kobbari laddu|కొబ్బరి లడ్డు|nariyal ladoo|440|4|60|21|piece:35|ready
double-ka-meetha|Double ka meetha|double ka meetha|డబుల్ కా మీఠా|shahi tukda|290|6|38|13|cup:100|ready
qubani|Qubani ka meetha|qubani ka meetha|ఖుబానీ కా మీఠా|apricot dessert|210|2|45|3|cup:100|ready
sandesh|Sandesh|sandesh|సందేశ్|bengali sweet|250|9|40|6|piece:30|ready
jaggery|Jaggery|bellam|బెల్లం|gur,gud|383|0.4|95|0.1|tsp:6|ready
sugar-in|Sugar|panchadara|పంచదార|chini,chakkera|387|0|100|0|tsp:4.2|ready
honey-in|Honey|tene|తేనె|shahad|304|0.3|82|0|tsp:7|ready
ice-cream-kulfi|Kulfi|kulfi|కుల్ఫీ|malai kulfi|230|5|25|12|piece:80|ready

# ---- drinks ----
masala-chai|Masala chai (with milk and sugar)|chai|టీ|tea,chaay|50|1.5|7|1.8|cup:150|ready
black-tea|Tea, black (no sugar)|nalla tea|బ్లాక్ టీ|kali chai|1|0|0.2|0|cup:240|ready
filter-coffee|Filter coffee (with milk and sugar)|coffee|కాఫీ|kaapi,south indian coffee|55|1.8|7.5|2|cup:150|ready
buttermilk|Buttermilk (spiced)|majjiga|మజ్జిగ|chaas,mor,chhach|40|1.8|4|1.5|cup:240|ready
lassi-sweet|Sweet lassi|lassi|లస్సీ|sweet lassi|90|3|14|2.5|cup:245|ready
mango-lassi|Mango lassi|mamidi lassi|మామిడి లస్సీ|mango shake|100|3|18|2|cup:245|ready
badam-milk|Badam milk|badam palu|బాదం పాలు|almond milk indian|85|3|11|3|cup:240|ready
haldi-milk|Turmeric milk (haldi doodh)|pasupu palu|పసుపు పాలు|golden milk|70|3.4|6|3.5|cup:240|ready
sugarcane-juice|Sugarcane juice|cheruku rasam|చెరకు రసం|ganne ka ras|70|0.2|17|0.1|cup:240|ready
nimbu-pani|Nimbu pani (lemonade, sweet)|nimma sarbath|నిమ్మ షర్బత్|shikanji,lemonade|40|0|10|0|cup:240|ready
jaljeera|Jal jeera|jaljeera|జల్జీరా|jaljira|20|0.2|4|0.1|cup:240|ready
ragi-malt|Ragi malt (java)|ragi java|రాగి జావ|ragi ambali,ragi kanji|65|1.8|13|0.7|cup:240|ready
rice-kanji|Rice kanji (ganji)|annam ganji|గంజి|gruel,pej|35|0.7|8|0.1|cup:240|ready
thandai|Thandai|thandai|తండై|holi drink|110|3.5|15|4|cup:240|ready
toddy|Palm toddy (kallu)|kallu|కల్లు|toddy|45|0.2|10|0|cup:240|ready
chocolate-milk-in|Health drink (malted, made with milk)|health drink|హెల్త్ డ్రింక్|horlicks,bournvita|85|3.5|13|2|cup:240|ready

# ---- dairy, fats, spices ----
milk-buffalo|Milk, buffalo|bheinsa palu|గేదె పాలు|buffalo milk,doodh|97|3.7|5|6.5|cup:244|ready
milk-cow-in|Milk, cow|aavu palu|ఆవు పాలు|cow milk|67|3.2|4.4|4.1|cup:244|ready
curd|Curd / dahi (whole milk)|perugu|పెరుగు|dahi,yogurt,thayir|60|3.1|3|4|cup:245|ready
butter-in|Butter (white / makkhan)|venna|వెన్న|makhan|729|0.5|0|81|tsp:5|ready
khoa|Khoa / mawa|khova|ఖోవా|mawa|421|14|20|31|serving:30|ready
coconut-oil|Coconut oil|kobbari noone|కొబ్బరి నూనె|nariyal tel|900|0|0|100|tsp:4.5|ready
groundnut-oil|Groundnut oil|verusenaga noone|వేరుశనగ నూనె|peanut oil|900|0|0|100|tsp:4.5|ready
sesame-oil|Sesame oil (gingelly)|nuvvula noone|నువ్వుల నూనె|til oil,nallennai|900|0|0|100|tsp:4.5|ready
sunflower-oil|Sunflower oil|pottu tirugudu noone|పొద్దుతిరుగుడు నూనె|refined oil|900|0|0|100|tsp:4.5|ready
mustard-oil|Mustard oil|aavala noone|ఆవాల నూనె|sarson tel|900|0|0|100|tsp:4.5|ready
turmeric|Turmeric powder|pasupu|పసుపు|haldi|312|9.7|67|3.3|tsp:3|ready
red-chilli-powder|Red chilli powder|karam|కారం|lal mirch,mirchi powder|282|12|50|14|tsp:2.5|ready
cumin|Cumin seeds|jeelakarra|జీలకర్ర|jeera|375|17.8|44|22|tsp:2.1|ready
mustard-seeds|Mustard seeds|avalu|ఆవాలు|rai,sarson|469|24.9|28|36|tsp:3|ready
coriander-seeds|Coriander seeds / powder|dhaniyalu|ధనియాలు|dhania,coriander powder|298|12.4|55|17.8|tsp:2|ready
black-pepper|Black pepper|miriyalu|మిరియాలు|kali mirch|251|10.4|64|3.3|tsp:2.3|ready
cardamom|Cardamom|yalakulu|యాలకులు|elaichi,elakkai|311|10.8|68|6.7|piece:0.3|ready
cloves|Cloves|lavangalu|లవంగాలు|laung|274|6|66|13|tsp:2|ready
cinnamon|Cinnamon|dalchina chekka|దాల్చిన చెక్క|dalchini|247|4|81|1.2|tsp:2.6|ready
fenugreek|Fenugreek seeds (methi)|menthulu|మెంతులు|methi dana|323|23|58|6.4|tsp:3.7|ready
fennel|Fennel seeds (saunf)|sompu|సోంపు|saunf,variyali|345|15.8|52|14.9|tsp:2|ready
asafoetida|Asafoetida (hing)|inguva|ఇంగువ|hing|297|4|68|1.1|tsp:3|ready
garam-masala|Garam masala|garam masala|గరం మసాలా|masala powder|379|13|55|15|tsp:2|ready
salt-in|Salt|uppu|ఉప్పు|namak|0|0|0|0|tsp:6|ready
ajwain|Ajwain (carom seeds)|vamu|వాము|ajowan,omam|305|15.4|43|25|tsp:2|ready
poppy-seeds|Poppy seeds (khus khus)|gasagasalu|గసగసాలు|khus khus|525|18|28|42|tsp:3|ready
# ---- more tiffins and breads ----
rava-idli|Rava idli|rava idli|రవ్వ ఇడ్లీ|semolina idli|142|4.5|22|4|piece:60|ready
ragi-dosa|Ragi dosa|ragi dosa|రాగి దోశ|finger millet dosa,ragi dosai|151|4|27|3|piece:80|ready
neer-dosa|Neer dosa|neer dosa|నీర్ దోశ|rice crepe|140|2.5|28|2|piece:60|ready
benne-dosa|Benne dosa (butter dosa)|benne dosa|బెన్నె దోశ|davangere dosa|208|4|30|8|piece:90|ready
mysore-masala-dosa|Mysore masala dosa|mysore masala dosa|మైసూర్ మసాలా దోశ|red chutney dosa|201|4.5|30|7|piece:160|ready
egg-dosa|Egg dosa|egg dosa|గుడ్డు దోశ|muttai dosai|171|7|20|7|piece:110|ready
oats-dosa|Oats dosa|oats dosa|ఓట్స్ దోశ|oat dosa|147|5|25|3|piece:80|ready
paper-dosa|Paper dosa|paper dosa|పేపర్ దోశ|crispy dosa|179|3.5|30|5|piece:100|ready
onion-dosa|Onion dosa|onion dosa|ఉల్లిపాయ దోశ|onion uttapam dosa|160|4|27|4|piece:100|ready
paniyaram|Paniyaram / ponganalu|ponganalu|పొంగనాలు|gunta ponganalu,kuzhi paniyaram|203|5|30|7|piece:25|ready
idli-upma|Idli upma|idli upma|ఇడ్లీ ఉప్మా|leftover idli upma|166|4|24|6|cup:180|ready
garelu|Garelu (vada)|garelu|గారెలు|minapa garelu,ulundu vadai|258|9|24|14|piece:45|ready
sabudana-vada|Sabudana vada|sabudana vada|సగ్గుబియ్యం వడ|sago fritters|298|3|40|14|piece:50|ready
akki-roti|Akki roti|akki rotti|అక్కి రొట్టె|rice flour roti|206|3|35|6|piece:80|ready
jonna-rotte|Jonna rotte (jowar roti, plain)|jonna rotte|జొన్న రొట్టె|jowar bhakri|335|10|70|1.7|piece:60|ready
sarva-pindi|Sarva pindi|sarva pindi|సర్వ పిండి|rice flour pancake,thapala chekka|241|5|35|9|piece:90|ready
dibba-rotte|Dibba rotte|dibba rotte|దిబ్బ రొట్టె|thick black gram dosa|215|8|30|7|piece:120|ready
pulka|Pulka / phulka (no ghee)|pulka|పుల్కా|phulka,roti without oil|243|9|45|3|piece:35|ready
tandoori-roti|Tandoori roti|tandoori roti|తందూరి రోటీ|tandoor roti|254|9|50|2|piece:60|ready
butter-naan|Butter naan|butter naan|బటర్ నాన్|butter naan|303|8.5|47|9|piece:90|ready
kulcha|Kulcha (plain)|kulcha|కుల్చా|amritsari kulcha|286|8|50|6|piece:80|ready
makki-roti|Makki di roti|makki roti|మక్కి రోటీ|corn roti|300|6|60|4|piece:70|ready
gobi-paratha|Gobi paratha|gobi paratha|గోబీ పరాఠా|cauliflower paratha|245|6|35|9|piece:90|ready
methi-paratha|Methi paratha|methi paratha|మెంతి పరాఠా|fenugreek paratha|261|7|38|9|piece:70|ready
mooli-paratha|Mooli paratha|mooli paratha|ముల్లంగి పరాఠా|radish paratha|249|6|36|9|piece:90|ready
poori-bhaji|Poori with potato bhaji|poori bhaji|పూరీ భాజీ|puri aloo|248|5|30|12|serving:200|ready
chole-bhature|Chole bhature|chole bhature|ఛోలే భటూరే|chana bhatura|269|8|30|13|serving:300|ready
misal-pav|Misal pav|misal pav|మిసల్ పావ్|usal pav|200|7|25|8|serving:300|ready
thalipeeth|Thalipeeth|thalipeeth|తాలిపీఠ్|multigrain flatbread|264|8|40|8|piece:80|ready
dalia|Dalia (broken wheat porridge)|godhuma ravva ganji|గోధుమ రవ్వ గంజి|daliya,cracked wheat porridge|104|3.5|18|2|cup:200|ready
dalia-raw|Dalia (broken wheat), dry|godhuma ravva|గోధుమ రవ్వ|cracked wheat,lapsi|350|12|72|1.5|cup:160|raw
veg-sandwich|Vegetable sandwich|veg sandwich|వెజ్ శాండ్‌విచ్|bread sandwich|236|7|34|8|piece:140|ready
bread-omelette|Bread omelette|bread omelette|బ్రెడ్ ఆమ్లెట్|egg sandwich|236|10|22|12|serving:150|ready
brown-bread|Brown bread slice|brown bread|బ్రౌన్ బ్రెడ్|whole wheat bread|248|11|43|3.5|piece:30|ready
white-bread|White bread slice|white bread|వైట్ బ్రెడ్|milk bread|264|9|49|3.5|piece:25|ready
bun-plain|Bun (plain)|bun|బన్|burger bun,dinner roll|272|9|50|4|piece:60|ready
muesli|Muesli|muesli|ముస్లీ|granola|367|10|66|7|cup:60|ready
vangi-bath|Vangi bath|vangi bath|వంకాయ అన్నం|brinjal rice|183|3|27|7|cup:200|ready
kesari-bath|Kesari bath|kesari bath|కేసరి బాత్|rava kesari|310|3|52|10|cup:150|ready
# ---- more rice dishes ----
brown-rice|Brown rice|brown rice|దంపుడు బియ్యం|red rice,hand pounded rice|362|7.5|77|2.7|cup:190|raw
brown-rice-cooked|Brown rice, cooked|brown rice annam|దంపుడు బియ్యం అన్నం|brown rice cooked|110|2.6|23|0.9|cup:195|ready
white-rice-cooked|Rice, cooked (white)|annam|అన్నం|cooked rice,sadam,steamed rice|126|2.7|28|0.3|cup:160|ready
bagara-annam|Bagara annam|bagara annam|బగారా అన్నం|bagara rice|186|3|30|6|cup:180|ready
pappu-annam|Pappu annam (dal rice)|pappu annam|పప్పు అన్నం|dal chawal|149|4.5|26|3|cup:220|ready
rajma-chawal|Rajma chawal|rajma chawal|రాజ్మా చావల్|rajma rice|151|5|26|3|serving:350|ready
mushroom-biryani|Mushroom biryani|mushroom biryani|మష్రూమ్ బిర్యానీ|mushroom dum biryani|178|4|27|6|cup:250|ready
kheema-pulao|Kheema pulao|kheema pulao|కీమా పులావ్|mutton mince rice|204|8|25|8|cup:250|ready
matar-pulao|Matar pulao|matar pulao|బఠాణీ పులావ్|peas pulao|171|3.5|28|5|cup:200|ready
haleem|Haleem|haleem|హలీమ్|hyderabadi haleem|148|9|10|8|cup:250|ready
millet-pongal|Millet pongal|millet pongal|చిరుధాన్యాల పొంగలి|korra pongal,foxtail pongal|161|5|24|5|cup:200|ready
daddojanam|Daddojanam|daddojanam|దద్దోజనం|temple curd rice|144|3|24|4|cup:220|ready
chitrannam|Chitrannam (mixed rice)|chitrannam|చిత్రాన్నం|lemon tamarind rice|186|3|30|6|cup:200|ready
egg-fried-rice|Egg fried rice|egg fried rice|ఎగ్ ఫ్రైడ్ రైస్|egg rice|199|6|28|7|cup:200|ready
schezwan-fried-rice|Schezwan fried rice|schezwan rice|షెజ్వాన్ రైస్|szechuan rice|199|4|30|7|cup:200|ready
veg-hakka-noodles|Veg hakka noodles|hakka noodles|హక్కా నూడుల్స్|chow mein,chowmein|182|4|28|6|cup:180|ready
noodles-instant-cooked|Instant noodles, cooked|instant noodles|ఇన్‌స్టంట్ నూడుల్స్|ramen|152|4.5|20|6|cup:200|ready
pasta-cooked|Pasta, cooked|pasta|పాస్తా|macaroni,spaghetti|155|5.8|31|0.9|cup:140|ready
# ---- more dals and curries ----
chana-dal-fry|Chana dal fry|chana dal fry|సెనగపప్పు ఫ్రై|bengal gram dal curry|128|7|16|4|cup:200|ready
dal-palak|Dal palak (spinach dal)|palakura pappu|పాలకూర పప్పు|spinach dal|87|5|10|3|cup:200|ready
mixed-dal|Mixed dal|mixed dal|మిక్స్డ్ పప్పు|panchmel dal|111|6|15|3|cup:200|ready
moong-dal-tadka|Moong dal tadka|pesara pappu|పెసర పప్పు|yellow moong dal|101|5.5|13|3|cup:200|ready
masoor-dal-curry|Masoor dal curry|masoor dal|మసూర్ పప్పు|red lentil curry|101|5.5|13|3|cup:200|ready
kandi-pappu|Pappu (toor dal curry)|kandi pappu|కందిపప్పు|plain dal,arhar dal|107|6|14|3|cup:200|ready
pappu-charu|Pappu charu|pappu charu|పప్పుచారు|dal rasam|46|2|6|1.5|cup:200|ready
pachi-pulusu|Pachi pulusu|pachi pulusu|పచ్చి పులుసు|raw tamarind rasam|27|0.5|4|1|cup:200|ready
tomato-curry|Tomato curry|tomato kura|టమాటా కూర|tomato gravy|83|1.5|8|5|cup:200|ready
baingan-masala|Baingan masala|vankaya masala|వంకాయ మసాలా|brinjal masala|103|2|8|7|cup:200|ready
bhindi-masala|Bhindi masala|bendakaya masala|బెండకాయ మసాలా|okra masala|105|2.5|8|7|cup:150|ready
dum-aloo|Dum aloo|dum aloo|దమ్ ఆలూ|kashmiri dum aloo|138|2.5|14|8|cup:200|ready
aloo-matar|Aloo matar|aloo matar|ఆలూ బఠాణీ|potato peas curry|120|3.5|13|6|cup:200|ready
aloo-methi|Aloo methi|aloo menthi|ఆలూ మెంతి|potato fenugreek|122|3|14|6|cup:150|ready
aloo-capsicum|Aloo capsicum|aloo capsicum|ఆలూ క్యాప్సికమ్|potato capsicum fry|114|2|13|6|cup:150|ready
veg-korma|Vegetable korma|veg kurma|వెజ్ కుర్మా|mixed veg kurma|142|3|10|10|cup:200|ready
malai-kofta|Malai kofta|malai kofta|మలై కోఫ్తా|paneer kofta|212|5|12|16|serving:200|ready
shahi-paneer|Shahi paneer|shahi paneer|షాహీ పనీర్|paneer in cream gravy|221|9|8|17|cup:200|ready
paneer-korma|Paneer korma|paneer kurma|పనీర్ కుర్మా|paneer in korma|199|9|7|15|cup:200|ready
mushroom-masala|Mushroom masala|mushroom masala|మష్రూమ్ మసాలా|mushroom curry|116|4|7|8|cup:200|ready
sarson-saag|Sarson ka saag|sarson ka saag|సర్సోన్ కా సాగ్|mustard greens curry|94|3|7|6|cup:200|ready
lauki-kofta|Lauki kofta|sorakaya kofta|సొరకాయ కోఫ్తా|bottle gourd kofta|133|3|10|9|serving:200|ready
tindora-fry|Tindora fry|dondakaya fry|దొండకాయ ఫ్రై|ivy gourd fry|101|1.5|8|7|cup:100|ready
cabbage-poriyal|Cabbage poriyal|cabbage kura|క్యాబేజీ కూర|cabbage stir fry|72|2|7|4|cup:100|ready
beans-poriyal|Beans poriyal|beans kura|బీన్స్ కూర|french beans stir fry|78|2.5|8|4|cup:100|ready
carrot-poriyal|Carrot poriyal|carrot kura|క్యారెట్ కూర|carrot stir fry|82|1.5|10|4|cup:100|ready
gummadikaya-kura|Pumpkin curry|gummadikaya kura|గుమ్మడికాయ కూర|kaddu sabzi|73|1.2|8|4|cup:150|ready
aratikaya-fry|Raw banana fry|aratikaya fry|అరటికాయ వేపుడు|kela fry,vazhakkai fry|158|1.5|20|8|cup:100|ready
chintakaya-pachadi|Tamarind chutney (chintapandu pachadi)|chintapandu pachadi|చింతపండు పచ్చడి|imli chutney|202|1|45|2|tbsp:15|ready
kobbari-pachadi|Coconut chutney, thick|kobbari pachadi|కొబ్బరి పచ్చడి|nariyal chutney|228|3|9|20|tbsp:15|ready
perugu-pachadi|Perugu pachadi (curd chutney)|perugu pachadi|పెరుగు పచ్చడి|curd salad|57|2.5|5|3|cup:150|ready
nalla-karam|Nalla karam / karivepaku podi|karivepaku karam|కరివేపాకు కారం|curry leaf podi|433|12|40|25|tsp:4|ready
nuvvula-podi|Nuvvula podi (sesame podi)|nuvvula karam|నువ్వుల కారం|til podi|488|14|18|40|tsp:4|ready
kandi-podi|Kandi podi|kandi podi|కంది పొడి|toor dal podi|395|20|45|15|tsp:4|ready
# ---- non-vegetarian, more ----
chicken-korma|Chicken korma|chicken kurma|చికెన్ కుర్మా|chicken in korma|176|12|5|12|cup:200|ready
chicken-masala|Chicken masala|chicken masala|చికెన్ మసాలా|chicken tikka masala|162|14|4|10|cup:200|ready
chicken-do-pyaza|Chicken do pyaza|chicken do pyaza|చికెన్ దో ప్యాజా|onion chicken curry|153|13|5|9|cup:200|ready
pepper-chicken|Pepper chicken|pepper chicken|పెప్పర్ చికెన్|chicken pepper fry|182|20|3|10|serving:150|ready
chettinad-chicken|Chettinad chicken|chettinad chicken|చెట్టినాడ్ చికెన్|spicy chicken curry|175|15|4|11|cup:200|ready
chicken-breast-raw|Chicken breast, raw|chicken breast|చికెన్ బ్రెస్ట్|chicken boneless,skinless|113|22.5|0|2.6|serving:100|raw
chicken-breast-cooked|Chicken breast, cooked (plain)|chicken breast cooked|ఉడికించిన చికెన్ బ్రెస్ట్|grilled chicken breast|156|31|0|3.6|serving:100|cooked
chicken-thigh-raw|Chicken thigh, raw (skinless)|chicken thigh|చికెన్ తొడ|chicken leg boneless|152|20|0|8|serving:100|raw
chicken-liver|Chicken liver, cooked|chicken liver|చికెన్ లివర్|liver fry|158|24|1|6.5|serving:100|cooked
chicken-soup|Chicken soup|chicken soup|చికెన్ సూప్|clear chicken soup|29|3|2|1|cup:240|ready
chicken-pakora|Chicken pakora|chicken pakora|చికెన్ పకోడీ|chicken pakoda|252|17|10|16|serving:100|ready
chilli-chicken|Chilli chicken|chilli chicken|చిల్లీ చికెన్|dry chilli chicken|221|16|10|13|serving:150|ready
chicken-manchurian|Chicken manchurian|chicken manchurian|చికెన్ మంచూరియా|manchurian|173|11|12|9|serving:150|ready
rogan-josh|Mutton rogan josh|rogan josh|రోగన్ జోష్|kashmiri mutton curry|190|13|3|14|cup:200|ready
mutton-korma|Mutton korma|mutton kurma|మటన్ కుర్మా|goat korma|212|13|4|16|cup:200|ready
mutton-pepper-fry|Mutton pepper fry|mutton pepper fry|మటన్ పెప్పర్ ఫ్రై|goat pepper fry|230|22|4|14|serving:150|ready
mutton-liver|Mutton liver fry|mutton liver|మటన్ లివర్|goat liver fry,boti|193|23|5|9|serving:100|ready
mutton-paya|Paya (trotters soup)|paya|పాయా|goat trotter soup|85|8|2|5|cup:240|ready
seekh-kebab|Seekh kebab|seekh kebab|సీక్ కబాబ్|mutton seekh|241|18|4|17|piece:50|ready
shami-kebab|Shami kebab|shami kebab|షామీ కబాబ్|mutton shami|204|14|10|12|piece:40|ready
chicken-kebab|Chicken kebab|chicken kebab|చికెన్ కబాబ్|reshmi kebab|164|20|3|8|piece:40|ready
tuna-canned|Tuna, canned in water|tuna|ట్యూనా|canned tuna|109|25|0|1|serving:100|ready
salmon-cooked|Salmon, cooked|salmon|సాల్మన్|salmon fish|196|22|0|12|serving:100|cooked
seer-fish|Seer fish (vanjaram), raw|vanjaram|వంజరం|king fish,surmai,neymeen|98|20|0|2|serving:100|raw
catla|Catla fish, raw|bochcha|బొచ్చె|katla|86|17|0|2|serving:100|raw
mackerel|Mackerel (bangda), raw|kanagalu|కనగలు|bangda,ayala|139|19|0|7|serving:100|raw
tilapia|Tilapia, raw|tilapia|టిలాపియా|chitralada,jalebi fish|98|20|0|2|serving:100|raw
prawns-raw|Prawns, raw|royyalu|రొయ్యలు|shrimp,jhinga|89|20|0|1|serving:100|raw
prawn-masala|Prawn masala|royyala kura|రొయ్యల కూర|prawn curry thick|153|13|5|9|cup:200|ready
tawa-fish|Tawa fish fry|chepa vepudu|చేప వేపుడు|fish tawa fry,fish fry masala|199|20|5|11|serving:100|ready
fish-pulusu|Fish pulusu|chepala pulusu|చేపల పులుసు|tamarind fish curry,meen kuzhambu|110|11|3|6|cup:200|ready
apollo-fish|Apollo fish|apollo fish|అపోలో ఫిష్|fish fry hyderabadi|230|16|10|14|serving:120|ready
squid|Squid / calamari, raw|squid|స్క్విడ్|calamari,kanava|89|16|3|1.4|serving:100|raw
egg-raw|Egg, whole raw|kodi guddu|కోడి గుడ్డు|egg,anda|139|12.6|0.7|9.5|piece:50|raw
egg-white|Egg white|guddu tella sua|గుడ్డు తెల్లసొన|egg white boiled|49|11|0.7|0.2|piece:33|ready
omelette-plain|Omelette (2 eggs)|omelette|ఆమ్లెట్|egg omelet|172|10.5|1|14|piece:110|ready
egg-roll|Egg roll (kathi roll)|egg roll|ఎగ్ రోల్|egg kathi roll|234|8|28|10|piece:180|ready
quail-egg|Quail egg, boiled|pitta guddu|పిట్ట గుడ్డు|kaada egg|153|13|0.4|11|piece:10|ready
# ---- more snacks and street food ----
bonda-mysore|Mysore bonda|mysore bonda|మైసూర్ బజ్జీ|goli baje,urad bonda|324|6|30|20|piece:30|ready
aloo-bajji|Aloo bajji|aloo bajji|ఆలూ బజ్జీ|potato bajji|275|5|30|15|piece:40|ready
vankaya-bajji|Brinjal bajji|vankaya bajji|వంకాయ బజ్జీ|eggplant fritter|255|5|25|15|piece:40|ready
veg-cutlet|Vegetable cutlet|veg cutlet|వెజ్ కట్లెట్|veg patty|214|5|26|10|piece:60|ready
veg-spring-roll|Veg spring roll|spring roll|స్ప్రింగ్ రోల్|veg roll|239|5|30|11|piece:70|ready
aloo-tikki|Aloo tikki|aloo tikki|ఆలూ టిక్కీ|potato patty|202|4|24|10|piece:60|ready
ragda-pattice|Ragda pattice|ragda pattice|రగడా ప్యాటీస్|ragda patties|183|6|24|7|serving:250|ready
sev-puri|Sev puri|sev puri|సేవ్ పూరి|papdi chaat|290|6|35|14|serving:150|ready
dabeli|Dabeli|dabeli|డబేలి|kutchi dabeli|263|6|35|11|piece:120|ready
kathi-roll|Paneer kathi roll|paneer roll|పనీర్ రోల్|paneer frankie|256|9|28|12|piece:200|ready
chakli|Chakli / murukku (rice)|chakralu|చక్రాలు|chakli|446|7|55|22|piece:20|ready
ribbon-pakoda|Ribbon pakoda|ribbon pakodi|రిబ్బన్ పకోడీ|ola pakoda|510|10|50|30|serving:30|ready
kara-boondi|Kara boondi|kara boondi|కారబూంది|boondi,khara boondi|521|11|45|33|serving:30|ready
banana-chips|Banana chips|arati chips|అరటి చిప్స్|kerala banana chips|539|2.5|58|33|serving:30|ready
gavvalu|Gavvalu|gavvalu|గవ్వలు|sweet shells|458|5|60|22|serving:30|ready
janthikalu|Janthikalu|janthikalu|జంతికలు|jantikalu,murukulu|470|9|50|26|serving:30|ready
nippattu|Nippattu / thattai|nippattu|నిప్పట్టు|thattai,rice chips|473|7|55|25|piece:20|ready
khakhra|Khakhra|khakhra|ఖాఖ్రా|gujarati crackers|402|13|65|10|piece:20|ready
fafda|Fafda|fafda|ఫాఫ్డా|gathiya|502|13|45|30|serving:40|ready
bhakarwadi|Bhakarwadi|bhakarwadi|భాకర్‌వడి|bakarwadi|518|7|55|30|piece:20|ready
gobi-manchurian|Gobi manchurian|gobi manchurian|గోబీ మంచూరియా|cauliflower manchurian|186|4|20|10|serving:150|ready
paneer-65|Paneer 65|paneer 65|పనీర్ 65|paneer fry|264|11|10|20|serving:120|ready
chilli-paneer|Chilli paneer|chilli paneer|చిల్లీ పనీర్|paneer chilli dry|229|11|8|17|serving:150|ready
baby-corn-manchurian|Baby corn manchurian|baby corn manchurian|బేబీ కార్న్ మంచూరియా|baby corn fry|182|3|20|10|serving:150|ready
pizza-slice|Pizza, cheese (1 slice)|pizza|పిజ్జా|margherita pizza|266|11|33|10|piece:100|ready
burger-veg|Veg burger|veg burger|వెజ్ బర్గర్|aloo tikki burger|242|8|30|10|piece:150|ready
burger-chicken|Chicken burger|chicken burger|చికెన్ బర్గర్|zinger burger|260|13|25|12|piece:180|ready
momos-chicken|Chicken momos|chicken momos|చికెన్ మోమోస్|steamed chicken dumplings|152|9|20|4|piece:30|ready
white-sauce-pasta|White sauce pasta|white sauce pasta|వైట్ సాస్ పాస్తా|alfredo pasta|193|6|22|9|cup:200|ready
cake-plain|Cake, sponge (plain)|cake|కేక్|vanilla cake|379|5|56|15|piece:60|ready
cookies|Cookies / biscuits (butter)|cookies|కుకీస్|butter biscuit,osmania biscuit|464|6|65|20|piece:12|ready
digestive-biscuit|Digestive biscuit|digestive biscuit|డైజెస్టివ్ బిస్కెట్|wheat biscuit|468|7|65|20|piece:15|ready
donut|Doughnut|donut|డోనట్|doughnut|398|5|45|22|piece:60|ready
chocolate-dark|Dark chocolate|dark chocolate|డార్క్ చాక్లెట్|70 percent chocolate|590|8|45|42|piece:10|ready
chocolate-milk-bar|Milk chocolate|milk chocolate|మిల్క్ చాక్లెట్|dairy milk,chocolate bar|530|7|58|30|piece:10|ready
# ---- more sweets ----
boondi-laddu|Boondi laddu|boondi laddu|బూందీ లడ్డూ|motichoor ladoo,tirupati laddu|458|7|58|22|piece:40|ready
nuvvula-laddu|Nuvvula laddu (sesame)|nuvvula laddu|నువ్వుల లడ్డు|til ladoo|506|11|48|30|piece:30|ready
kajjikayalu|Kajjikayalu|kajjikayalu|కజ్జికాయలు|karjikai,gujiya|444|5|52|24|piece:40|ready
malpua|Malpua|malpua|మాల్పువా|sweet pancake|396|4|50|20|piece:50|ready
paramannam|Paramannam / rice kheer|paramannam|పరమాన్నం|payasam,payasa|161|3|26|5|cup:150|ready
pala-payasam|Pal payasam|pala payasam|పాలపాయసం|milk payasam|153|3|24|5|cup:150|ready
kalakand|Kalakand|kalakand|కలాకండ్|milk cake|331|9|40|15|piece:30|ready
peda|Peda|peda|పేడా|milk peda,doodh peda|404|10|55|16|piece:20|ready
imarti|Imarti|imarti|ఇమర్తి|jangiri|410|4|58|18|piece:40|ready
balushahi|Balushahi|balushahi|బాలుషాహి|badusha|450|5|58|22|piece:50|ready
soan-papdi|Soan papdi|soan papdi|సోన్ పాపిడి|patisa|436|6|58|20|piece:25|ready
rabri|Rabri|rabri|రబ్డీ|rabdi|236|7|25|12|cup:100|ready
shrikhand|Shrikhand|shrikhand|శ్రీఖండ్|sweet hung curd|220|5|32|8|cup:100|ready
basundi|Basundi|basundi|బాసుంది|sweetened thick milk|189|5|22|9|cup:150|ready
phirni|Phirni|phirni|ఫిర్నీ|rice pudding|149|4|22|5|cup:120|ready
moong-dal-halwa|Moong dal halwa|pesara pappu halwa|పెసరపప్పు హల్వా|moong halwa|366|7|35|22|cup:100|ready
badam-halwa|Badam halwa|badam halwa|బాదం హల్వా|almond halwa|444|8|40|28|cup:80|ready
pumpkin-halwa|Pumpkin halwa|gummadikaya halwa|గుమ్మడికాయ హల్వా|kaddu halwa|222|3|30|10|cup:100|ready
poornalu|Poornalu / boorelu|poornalu|పూర్ణాలు|burelu|366|5|55|14|piece:40|ready
pootharekulu|Pootharekulu|pootharekulu|పూతరేకులు|paper sweet|398|3|65|14|piece:40|ready
dry-fruit-laddu|Dry fruit laddu|dry fruit laddu|డ్రై ఫ్రూట్ లడ్డు|dates nut ladoo|430|8|50|22|piece:30|ready
til-chikki|Til chikki|nuvvula chikki|నువ్వుల చిక్కీ|sesame brittle|513|12|60|25|piece:25|ready
kozhukattai|Kozhukattai / modak|kudumulu|కుడుములు|modak,ukdiche modak|176|3|32|4|piece:40|ready
mishti-doi|Mishti doi|mishti doi|మిష్టి దోయ్|sweet curd|138|3.5|22|4|cup:100|ready
chamcham|Cham cham|cham cham|చమ్ చమ్|chum chum|249|6|45|5|piece:50|ready
ice-cream|Ice cream (vanilla)|ice cream|ఐస్ క్రీమ్|vanilla ice cream|209|3.5|24|11|cup:100|ready
# ---- more drinks ----
lassi-salted|Salted lassi|uppu lassi|ఉప్పు లస్సీ|namkeen lassi,chaas thick|58|3.3|4.5|3|cup:250|ready
nannari|Nannari sharbat|nannari sharbat|నన్నారి షర్బత్|sarsaparilla drink|80|0.1|20|0|cup:200|ready
rose-milk|Rose milk|rose milk|రోజ్ మిల్క్|rose flavoured milk|87|3|12|3|cup:250|ready
mango-shake|Mango shake|mango shake|మామిడి షేక్|mango milkshake|101|2.5|16|3|cup:250|ready
banana-shake|Banana shake|banana shake|అరటి షేక్|banana milkshake|95|3|14|3|cup:250|ready
orange-juice|Orange juice|orange juice|నారింజ రసం|fresh juice,mosambi juice|45|0.7|10|0.2|cup:240|ready
apple-juice|Apple juice|apple juice|ఆపిల్ రసం|fruit juice|47|0.1|11.5|0.1|cup:240|ready
coffee-milk-sugar|Coffee with milk and sugar|coffee|కాఫీ|tea coffee with sugar,kaapi|59|1.8|9|1.8|cup:150|ready
black-coffee|Black coffee (no sugar)|black coffee|బ్లాక్ కాఫీ|americano|0|0.1|0|0|cup:240|ready
green-tea|Green tea|green tea|గ్రీన్ టీ|tea without milk|0|0|0|0|cup:240|ready
chai-sugar|Tea with milk and sugar (chai)|chai|చాయ్|tea|60|1.5|10|1.5|cup:150|ready
horlicks|Horlicks / Bournvita drink (with milk)|horlicks|హార్లిక్స్|malt drink,boost|88|3.5|13|2.5|cup:250|ready
soy-milk|Soy milk|soya milk|సోయా పాలు|soya milk unsweetened|35|3.3|1.5|1.8|cup:240|ready
almond-milk|Almond milk (unsweetened)|badam paalu|బాదం పాలు|almond beverage|13|0.5|0.3|1.1|cup:240|ready
coconut-milk|Coconut milk|kobbari paalu|కొబ్బరి పాలు|thengai paal|249|2.3|6|24|cup:240|ready
sattu-drink|Sattu drink|sattu|సత్తు|roasted gram drink|105|6|18|1|cup:250|ready
sattu-flour|Sattu flour|sattu pindi|సత్తు పిండి|roasted gram flour|394|20|65|6|tbsp:15|ready
panakam|Panakam|panakam|పానకం|jaggery ginger drink|60|0.1|15|0|cup:200|ready
kokum-sherbet|Kokum sharbat|kokum sharbat|కోకుమ్ షర్బత్|kokam juice|60|0.1|15|0|cup:200|ready
whey-protein|Whey protein powder|whey protein|వే ప్రోటీన్|protein powder,protein shake|398|78|8|6|piece:30|ready
cola|Cola / soft drink|cold drink|కూల్ డ్రింక్|coke,pepsi,thums up|42|0|10.6|0|cup:250|ready
# ---- more fruits ----
banana-yelakki|Banana, yelakki (small)|yelakki arati pandu|యాలకి అరటి పండు|elaichi banana|100|1.3|23|0.3|piece:60|raw
banana-red|Banana, red|erra arati pandu|ఎర్ర అరటి పండు|red banana|96|1.3|22|0.3|piece:100|raw
pear|Pear|pear|బేరి పండు|nashpati|62|0.4|15|0.1|piece:170|raw
plum|Plum|plum|ప్లం|aloo bukhara|50|0.7|11|0.3|piece:65|raw
peach|Peach|peach|పీచ్|aadu|46|0.9|10|0.3|piece:150|raw
cherry|Cherries|cherry|చెర్రీ|cherry fruit|70|1|16|0.2|cup:140|raw
strawberry|Strawberries|strawberry|స్ట్రాబెర్రీ|strawberry fruit|36|0.7|7.7|0.3|cup:150|raw
blueberry|Blueberries|blueberry|బ్లూబెర్రీ|blueberry fruit|62|0.7|14|0.3|cup:150|raw
dragon-fruit|Dragon fruit|dragon fruit|డ్రాగన్ ఫ్రూట్|kamalam|52|1.2|11|0.4|piece:200|raw
avocado|Avocado|avocado|అవకాడో|butter fruit|177|2|8.5|15|piece:150|raw
star-fruit|Star fruit|star fruit|స్టార్ ఫ్రూట్|kamrakh|35|1|7|0.3|piece:90|raw
ber|Ber (Indian jujube)|regu pandu|రేగు పండు|regi pallu,jujube|72|0.8|17|0.1|piece:15|raw
taati-munjalu|Ice apple (palmyra fruit)|taati munjalu|తాటి ముంజలు|nungu,palm fruit|40|0.8|9|0.1|piece:40|raw
pomelo|Pomelo|pomelo|పెద్ద బత్తాయి|chakotra|43|0.8|10|0|cup:190|raw
mosambi|Mosambi (sweet lime)|batayi|బత్తాయి|musambi|45|0.8|10|0.2|piece:120|raw
mixed-fruit-bowl|Mixed fruit bowl|fruit salad|ఫ్రూట్ సలాడ్|fruit chaat|54|0.8|12|0.3|cup:150|ready
dried-apricot|Dried apricot|dried apricot|ఎండిన ఆప్రికాట్|khubani dry|270|3.4|63|0.5|piece:8|ready
prunes|Prunes|prunes|ప్రూన్స్|dried plum|268|2.2|64|0.4|piece:9|ready
# ---- more vegetables ----
broccoli|Broccoli|broccoli|బ్రోకలీ|broccoli florets|43|2.8|7|0.4|cup:90|raw
zucchini|Zucchini|zucchini|జుకినీ|courgette|20|1.2|3.1|0.3|piece:190|raw
parwal|Pointed gourd (parwal)|parwal|పర్వల్|potol,kommu dondakaya|20|2|2.2|0.3|cup:100|raw
turai|Ridge gourd curry (turai sabzi)|beerakaya kura|బీరకాయ కూర|turai sabzi|66|1.5|6|4|cup:150|ready
kohlrabi|Kohlrabi|knol khol|నోల్ ఖోల్|navilkosu|32|1.7|6.2|0.1|piece:130|raw
raw-papaya|Raw papaya|papaya kaya|బొప్పాయి కాయ|green papaya|39|0.6|9|0.1|cup:140|raw
baby-corn|Baby corn|baby corn|బేబీ కార్న్|young corn|36|2.2|6|0.4|piece:15|raw
jackfruit-seeds|Jackfruit seeds, boiled|panasa pottu|పనస గింజలు|halasina beeja|182|6.6|38|0.4|piece:10|cooked
lettuce|Lettuce|lettuce|లెట్యూస్|salad leaves|19|1.4|2.9|0.2|cup:50|raw
shallots|Small onions (sambar onion)|chinna ullipaya|చిన్న ఉల్లిపాయలు|shallots,pearl onion|79|2.5|17|0.1|piece:20|raw
onion-white|Onion, white|vellulli|తెల్ల ఉల్లి|white onion|41|1.1|9|0.1|piece:110|raw
garlic-raw|Garlic|vellulli pothulu|వెల్లుల్లి|lahsun|162|6.4|33|0.5|piece:3|raw
ginger-garlic-paste|Ginger garlic paste|allam vellulli paste|అల్లం వెల్లుల్లి పేస్ట్|ginger garlic masala|76|3|15|0.5|tsp:6|ready
olives|Olives|olives|ఆలివ్స్|green olives|117|0.8|3.8|11|piece:4|ready
tofu|Tofu|tofu|టోఫు|soya paneer,bean curd|83|8|2|4.8|piece:100|ready
# ---- more dairy, nuts and pantry ----
cheese-slice|Cheese slice (processed)|cheese slice|చీజ్ స్లైస్|amul cheese|299|18|5|23|piece:20|ready
mozzarella|Mozzarella cheese|mozzarella|మోజరెల్లా|pizza cheese|295|22|2.2|22|piece:28|ready
cream|Fresh cream (malai)|malai|మీగడ|cream,fresh cream|245|2|3|25|tbsp:15|ready
condensed-milk|Condensed milk (sweetened)|condensed milk|కండెన్స్డ్ మిల్క్|milkmaid|333|8|55|9|tbsp:20|ready
skim-milk|Skimmed milk|skim milk|స్కిమ్డ్ మిల్క్|fat free milk|34|3.4|5|0.1|cup:245|ready
toned-milk|Toned milk|toned milk|టోన్డ్ మిల్క్|packet milk|59|3.1|4.8|3|cup:245|ready
greek-yogurt|Greek yogurt (plain)|greek yogurt|గ్రీక్ యోగర్ట్|hung curd|70|9|4|2|cup:200|ready
curd-low-fat|Curd, low fat|low fat curd|తక్కువ కొవ్వు పెరుగు|skim curd|50|4|5|1.5|cup:245|ready
peanut-butter|Peanut butter|peanut butter|పీనట్ బటర్|groundnut butter|630|25|20|50|tbsp:16|ready
pumpkin-seeds|Pumpkin seeds|gummadi ginjalu|గుమ్మడి గింజలు|pepitas|605|30|11|49|tbsp:9|ready
sunflower-seeds|Sunflower seeds|pottu tirugudu ginjalu|పొద్దుతిరుగుడు గింజలు|surajmukhi seeds|623|21|20|51|tbsp:9|ready
chia-seeds|Chia seeds|chia ginjalu|చియా గింజలు|chia|515|17|42|31|tbsp:12|ready
watermelon-seeds|Watermelon seeds (magaz)|puchakaya ginjalu|పుచ్చకాయ గింజలు|char magaz|595|28|15|47|tbsp:9|ready
mixed-dry-fruits|Mixed dry fruits and nuts|dry fruits|డ్రై ఫ్రూట్స్|trail mix|555|15|45|35|serving:30|ready
protein-bar|Protein bar|protein bar|ప్రోటీన్ బార్|energy bar|400|33|40|12|piece:50|ready
makhana-roasted|Makhana, roasted|makhana roasted|వేయించిన మఖానా|phool makhana roasted,fox nuts|356|9.7|77|1|cup:30|ready
moth-beans|Moth beans (matki), dry|matki|మటికి|matki,moth dal|354|23|62|1.6|cup:190|raw
soybean|Soybeans, dry|soya ginjalu|సోయా గింజలు|soya bean|444|36|30|20|cup:180|raw
white-peas|White peas, dry|safed matar|తెల్ల బఠాణీ|dried white peas|341|20|62|1.4|cup:200|raw
field-beans|Field beans (chikkudu), cooked|chikkudu ginjalu|చిక్కుడు గింజలు|val beans,avarekalu|116|8|20|0.5|cup:170|cooked
tomato-ketchup|Tomato ketchup|tomato ketchup|టమాటా కెచప్|tomato sauce|115|1.2|27|0.2|tbsp:17|ready
mayonnaise|Mayonnaise|mayonnaise|మయోనైస్|mayo|691|1.1|3|75|tbsp:14|ready
soy-sauce|Soy sauce|soy sauce|సోయా సాస్|soya sauce|53|8|5|0.1|tbsp:16|ready
green-chutney|Green chutney (mint coriander)|green chutney|పచ్చి చట్నీ|hari chutney|63|2|7|3|tbsp:15|ready
sambar-powder|Sambar powder|sambar podi|సాంబార్ పొడి|sambar masala|342|13|50|10|tsp:3|ready
sugar-brown|Brown sugar / jaggery powder|bellam podi|బెల్లం పొడి|gur powder,cane sugar|390|0.5|97|0|tsp:5|ready
mango-pickle|Mango pickle (avakaya, oily)|mamidikaya pickle|మామిడికాయ పచ్చడి|aam ka achar,mango achar|300|2|10|28|tsp:8|ready
`

type Row = { id: string; name: string; te: string; teScript: string; aliases: string[]; kcal: number; p: number; c: number; f: number; unit: SizedUnit; grams: number; state: PrepState }

const STATE_LABEL: Record<PrepState, string> = { raw: 'dry / raw', cooked: 'cooked', ready: 'ready to eat' }

function parse(): Row[] {
  const rows: Row[] = []
  for (const line of TABLE.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const x = t.split('|')
    if (x.length !== 11) throw new Error(`Indian foods table: bad line "${t.slice(0, 40)}"`)
    const [unit, grams] = x[9].split(':')
    rows.push({
      id: x[0], name: x[1], te: x[2], teScript: x[3], aliases: x[4].split(',').map((s) => s.trim()).filter(Boolean),
      kcal: Number(x[5]), p: Number(x[6]), c: Number(x[7]), f: Number(x[8]), unit: unit as SizedUnit, grams: Number(grams), state: x[10] as PrepState,
    })
  }
  return rows
}

function build(): FoodItem[] {
  const byId = new Map<string, FoodItem>()
  for (const r of parse()) {
    const state: FoodState = {
      state: r.state, basis: 'g', kcalPer100: r.kcal, proteinPer100: r.p, carbsPer100: r.c, fatPer100: r.f,
      unitSize: { [r.unit]: r.grams, serving: r.grams }, label: STATE_LABEL[r.state],
    }
    const have = byId.get(r.id)
    if (have) { have.states.push(state); continue }
    byId.set(r.id, {
      provider: 'local', providerId: `in-${r.id}`, name: r.name, nameTe: `${r.teScript} · ${r.te}`,
      aliases: [...r.aliases, r.te, r.teScript, 'indian'], states: [state], kind: 'generic', source: SRC, approximate: true,
    })
  }
  // A vegetable or fruit that only comes raw is simply "raw"; "dry / raw" is for grains and dals that also have a cooked version.
  for (const f of byId.values()) if (f.states.length === 1 && f.states[0].state === 'raw') f.states[0].label = 'raw'
  return [...byId.values()]
}

export const INDIAN_FOODS: FoodItem[] = build()
