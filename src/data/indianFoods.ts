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
export const INDIAN_FOODS_VERSION = 'indian-1'
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
