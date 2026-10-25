import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "src/data/lesson-source.json");
const extraPath = resolve(root, "src/data/lesson-source-extra.json");
const existing = JSON.parse(await readFile(sourcePath, "utf8"));
const groups = [
  ["Maths", "Fractions", [
    ["Fractions in a recipe", "Fraction ek whole cheez ke barabar hisson mein se kuch hisson ko dikhata hai.", "Aadha cup doodh ka matlab poore cup ke do equal parts mein se ek part hai.", "Recipe ke cup measures draw karo aur har amount ko equal parts ke roop mein label karo.", "One-half ko kitne equal fourths ke barabar likh sakte hain?", "2/4", "1/4", "4/2"],
    ["Compare fractions visually", "Same denominator wale fractions mein numerator batata hai ki kitne equal parts liye gaye.", "Agar dono rotiyon ko chaar equal tukdon mein baanta ho, to three-fourths two-fourths se zyada hai.", "Do paper strips ko same-size parts mein baanto aur rang wale parts compare karo.", "Same denominator mein kaunsa zyada hai: 3/5 ya 2/5?", "3/5", "2/5", "Dono hamesha equal"],
  ]],
  ["Maths", "Decimals", [
    ["Tenths on a number line", "Decimal point ke baad pehla digit tenths batata hai.", "0.3 ka matlab zero se one tak ke raaste ke das equal parts mein se teen parts hai.", "Zero aur one ke beech line banao, ten equal jumps mark karo, phir 0.3 par rang karo.", "0.7 mein kitne tenths hote hain?", "7", "70", "1"],
    ["Rupees and paise", "Ek rupaye mein 100 paise hote hain; decimal rupees aur paise ko saath dikhata hai.", "₹4.50 ka matlab chaar rupaye aur pachaas paise hai.", "Price tags ke imaginary examples banao aur rupees ko paise mein badal kar check karo.", "₹2.25 mein kitne paise hain?", "225", "25", "22"],
    ["Compare decimal amounts", "Decimal numbers compare karte waqt place value aur equal decimal places dekho.", "₹5.40, ₹5.04 se zyada hai kyunki 40 paise, 4 paise se zyada hain.", "Dono numbers ke tenths aur hundredths ko alag rang se underline karke compare karo.", "Kaunsa bada hai: 3.60 ya 3.06?", "3.60", "3.06", "Dono same"],
  ]],
  ["Maths", "Geometry", [
    ["Angles around us", "Angle do lines ya rays ke beech ka opening hota hai.", "Darwaza thoda kholne par chhota angle aur poora kholne par bada angle banta hai.", "Notebook ke kone se chhota, barabar aur bada opening draw karke compare karo.", "Right angle kaisa hota hai?", "Square corner jaisa", "Ek seedhi line", "Gol circle"],
    ["Perimeter walk", "Closed shape ka perimeter uski boundary ke sab side lengths ka total hai.", "Rectangle ke chaar edges par ungli chala kar sab sides add karna perimeter dhoondhta hai.", "Notebook par ek shape draw karo, sides ko centimetres mein naapkar total jodo.", "Perimeter kis cheez ka total hai?", "Sab boundary sides", "Sirf area", "Andar ke dots"],
    ["Symmetry in patterns", "Line symmetry mein shape fold karne par dono taraf ke parts match karte hain.", "Butterfly ke wings mein ek beech ki line ke aas-paas milti-julti symmetry dikh sakti hai.", "Paper shape draw karo, fold line lagao aur check karo ki dono halves overlap hote hain ya nahi.", "Symmetry line ke dono sides kaise hote hain?", "Mirror-like match", "Hamesha alag size", "No shape"],
  ]],
  ["Maths", "Word problems", [
    ["Choose the operation", "Pehle sawaal mein dekho ki cheezein jud rahi hain, baanti ja rahi hain, ya compare ho rahi hain.", "School ke mela mein 24 stalls hain aur har stall par 3 games hain; total games ke liye groups ko multiply karo.", "Sawaal ki zaroori sankhyaon par ghera banao aur apne chune operation ko ek line mein samjhao.", "Total games kitne hue?", "72", "27", "8"],
    ["Sharing equally", "Barabar baantne wale sawaal mein total vastuon ko logon ki sankhya se divide karte hain.", "36 aam ko 6 tokriyon mein barabar rakho to har tokri mein 6 aam aate hain.", "Chhote buttons lekar pehle har group ko ek-ek baanto, phir total ko division sentence mein likho.", "36 aam ko 6 tokriyon mein baantne par har tokri mein kitne aam?", "6", "30", "216"],
    ["Compare two amounts", "Difference poochha ho to badi sankhya mein se chhoti sankhya ghatao.", "Library mein 48 kahaani ki kitaabein aur 31 vigyaan ki kitaabein hain; zyada kitaabon ka antar 17 hai.", "Dono amounts ko number line par dikhao aur chhoti sankhya se badi tak ke jumps gino.", "48 aur 31 ka difference kya hai?", "17", "79", "31"],
    ["Two-step story sums", "Kuch sawaalon mein pehle total banta hai, phir us total ko groups mein baantna hota hai.", "4 dabbon mein 12 crayons har ek hain; 8 bachchon mein barabar baantoge to har ek ko 6 milenge.", "Har step ke baad unit likho; isse pata chalega ki agla operation kis quantity par hoga.", "4 groups of 12 ko 8 bachchon mein baanto. Har bachche ko kitne?", "6", "24", "48"],
    ["Estimate before solving", "Estimate ka matlab exact jawab se pehle aas-paas ka jawab sochna hai.", "199 rupaye ki kitaab aur 302 rupaye ka bag milkar lagbhag 500 rupaye honge.", "Har sankhya ko aasaan tens ya hundreds par round karo, estimate likho, phir exact calculation karo.", "199 + 302 ka behtar estimate kya hai?", "500", "100", "900"],
  ]],
  ["Maths", "Measurement", [
    ["Metres and centimetres", "Ek metre mein 100 centimetres hote hain; unit badalte waqt 100 ke groups gino.", "2 metre 35 centimetre ko 235 centimetre likh sakte hain.", "Ruler se notebook aur desk naapkar readings ko pehle centimetre aur phir metre-centimetre mein likho.", "3 metre mein kitne centimetres hote hain?", "300", "30", "3"],
    ["Mass in grams and kilograms", "Ek kilogram mein 1000 grams hote hain, isliye chhoti cheezon ke liye gram kaam aata hai.", "Aadha kilogram daal 500 grams hoti hai; do aise packets ek kilogram banate hain.", "Kitchen ke sealed packets ke label dekho aur unke gram ko kilogram se compare karo.", "2 kilogram mein kitne grams?", "2000", "200", "20"],
    ["Litres and millilitres", "Ek litre mein 1000 millilitres hote hain; bottle ki capacity isi relation se samjho.", "500 mL ki do bottles milkar 1 litre banti hain.", "Paani ke bina measuring cup ki markings dekho aur 250 mL ke chaar equal pours draw karo.", "1 litre mein kitne millilitres?", "1000", "100", "10"],
    ["Read a clock", "Clock par chhoti sui hour aur lambi sui minutes dikhati hai.", "3:30 par lambi sui 6 par hoti hai aur chhoti sui 3 aur 4 ke beech.", "Apne din ke teen kaam note karo; start aur finish time ke beech minutes gino.", "Ek ghante mein kitne minutes?", "60", "30", "100"],
    ["Perimeter with units", "Perimeter kisi band shape ke sab side lengths ka total hota hai.", "5 cm aur 3 cm sides wale rectangle ka perimeter 5 + 3 + 5 + 3, yaani 16 cm hai.", "Notebook par rectangle banao, har side naapkar addition ke saath unit bhi likho.", "4 cm side wale square ka perimeter kya hai?", "16 cm", "8 cm", "4 cm"],
  ]],
  ["Science", "Water cycle", [
    ["Water changes state", "Garmi se liquid paani vapour ban sakta hai aur thandak se vapour boondon mein badal sakta hai.", "Thandi glass ke bahar ki boondein glass se nahi, hawa ke water vapour se aati hain.", "Parent ke saath thandi glass observe karo aur andar-bahar ki boondon ka farq draw karo.", "Vapour thanda hokar boondein bane, ise kya kehte hain?", "Condensation", "Melting", "Freezing"],
    ["Rain returns water", "Badalon ki boondein jab bhaari hoti hain to varsha ke roop mein neeche gir sakti hain.", "Pahadon par girne wala paani streams aur nadiyon se samundar ki taraf ja sakta hai.", "Apne ilaake mein baarish ke baad paani kahan jaata hai, ek simple arrow diagram banao.", "Badalon se paani ka neeche girna kya hai?", "Precipitation", "Evaporation", "Condensation"],
  ]],
  ["Science", "Plants", [
    ["Leaves use sunlight", "Patte sunlight, hawa aur paani ki madad se plant ke liye food banane mein kaam karte hain.", "Khidki ke paas aur andhere kone ke patton ka rang compare karo; paudhe ko roshni kyun chahiye socho.", "Ek paudhe ka diagram banao aur leaf, sunlight, air aur water ko arrows se jodo.", "Plant ko food banane mein kaunsi energy madad karti hai?", "Sunlight", "Sound", "Plastic"],
    ["Roots hold and absorb", "Jadein paudhe ko mitti mein pakadti hain aur paani lene mein madad karti hain.", "Ghaas ki patli jadein aur gajar ki moti root alag dikhte hain, par dono plant ke kaam aate hain.", "Mitti se nikal chuke safe plant ko adult ke saath dekho; roots ko dhyan se observe karke wapas lagao.", "Roots ka ek kaam kya hai?", "Paani lena aur plant ko pakadna", "Beej banana hamesha", "Roshni paida karna"],
  ]],
  ["Science", "Our body", [
    ["Food travels through the body", "Khaana chabane ke baad body use chhote parts mein todti hai taaki nutrients mil saken.", "Roti ko dheere chabane par woh naram hoti hai; digestion ki shuruaat munh se hoti hai.", "Food path ko mouth, food pipe, stomach aur intestines ke labels ke saath draw karo.", "Digestion kahan se shuru hota hai?", "Mouth", "Knee", "Hair"],
    ["Lungs help us breathe", "Saans lete waqt hawa lungs tak jaati hai; body oxygen ka use karti hai.", "Aaraam se baithkar aur thoda chalne ke baad apni breathing count compare karo, bina zor lagaye.", "Chest ko touch kiye bina ek minute breaths gino aur note karo ki movement ke baad kya badla.", "Breathing mein kaunse organs madad karte hain?", "Lungs", "Stomach", "Bones"],
    ["The heart moves blood", "Heart ek muscle hai jo blood ko body ke alag parts tak pump karta hai.", "Walk ke baad pulse tez mehsoos ho sakti hai kyunki body ko zyada oxygen chahiye.", "Adult ki dekh-rekh mein wrist pulse ko aaraam se count karo; exercise ko safe aur halka rakho.", "Heart ka main kaam kya hai?", "Blood pump karna", "Food chew karna", "Sound sunna"],
  ]],
  ["Science", "Food", [
    ["Build a balanced plate", "Alag-alag food groups body ko energy, growth aur sehat ke liye alag nutrients dete hain.", "Dal, chawal, sabzi aur dahi ek meal mein alag tarah ke nutrients laate hain.", "Ghar ke kisi meal ki plate draw karke usme grains, pulses, vegetables aur fruit label karo.", "Protein ka ek common source kaunsa hai?", "Dal", "Candy", "Soda"],
    ["Carbohydrates give energy", "Roti aur chawal jaise foods carbohydrates dete hain, jo daily activity ke liye energy mein madad karte hain.", "School se pehle breakfast karne se padhai aur khel ke liye body ko energy mil sakti hai.", "Apne ek meal mein grains pehchano aur unhe energy group ke saath label karo.", "Carbohydrates ka ek source kaunsa hai?", "Rice", "Water", "Salt"],
    ["Protein helps growth", "Protein body ko grow aur repair karne mein madad karta hai.", "Dal, beans, eggs aur nuts protein wale foods ke examples ho sakte hain.", "Apne parivaar ke meal se protein source dhoondho; kisi food ko achha ya bura label na karo.", "Protein body ki kis cheez mein madad karta hai?", "Growth and repair", "Making shadows", "Making rain"],
    ["Food hygiene matters", "Saaf haath aur clean utensils food ke saath germs pahunchne ka risk kam karte hain.", "Khaane se pehle sabun aur paani se haath dhona ek simple hygiene habit hai.", "Khane se pehle aur baad ke teen safe steps draw karke class poster banao.", "Haath kab dhona chahiye?", "Khaane se pehle", "Kabhi nahi", "Sirf sone ke baad"],
    ["Store food safely", "Food ko dhak kar aur sahi jagah rakhna use dust aur insects se bachane mein madad karta hai.", "Bacha hua cooked food adult ki madad se thanda karke fridge mein rakha ja sakta hai.", "Kitchen mein dry grains ka sealed container dekho aur discuss karo ki lid kyun useful hai.", "Food ko dhakne ka ek fayda kya hai?", "Dust aur insects se bachana", "Use rangna", "Use dhoop se pighlana"],
  ]],
  ["Science", "Light", [
    ["Light travels from a source", "Hum tab dekhte hain jab roshni kisi object se reflect hokar aankhon tak pahunchti hai.", "Torch ek source hai; uski roshni book par pade to book dikhai deti hai.", "Adult ke saath torch se safe object illuminate karo; torch ko kisi ki aankhon mein mat dikhana.", "Torch kya hai?", "Light source", "A shadow", "A mirror"],
    ["Shadows need light", "Shadow tab banti hai jab object light ka raasta rokta hai.", "Dhoop mein tumhari shadow ki direction source light ke opposite hoti hai.", "Din mein safe open jagah par apni shadow observe karo aur uski outline ka time likho.", "Shadow banane ke liye kya zaroori hai?", "Light blocked by an object", "Only sound", "A closed book"],
    ["Mirrors reflect light", "Smooth mirror light ko reflect karta hai, isliye usme image dikh sakti hai.", "Mirror ko window se aane wali roshni ke paas rakho, par bright beam aankhon mein reflect na karo.", "Adult ke saath mirror aur rough paper compare karo; kis par clearer reflection dikhti hai?", "Clear reflection kis surface se milti hai?", "Smooth mirror", "Cotton", "Rough wall"],
    ["Materials and light", "Kuch materials light ko pass karte, kuch thoda pass karte, aur kuch rok dete hain.", "Clear glass transparent, tracing paper translucent, aur thick cardboard opaque hota hai.", "Adult ki madad se teen safe materials ke peeche torch rakho aur light ka farq note karo.", "Cardboard light ke saath kaisa hota hai?", "Opaque", "Transparent", "Liquid"],
    ["Colours in white light", "White light alag colours ka mix ho sakti hai; prism use rangon mein baant sakta hai.", "Baarish ke baad tiny water drops sunlight ko bend karke rainbow dikhane mein madad karte hain.", "Rainbow ke colours ko yaad se order mein draw karo; kabhi bhi seedha Suraj ko mat dekho.", "Rainbow mein colours ka source kya hota hai?", "Sunlight split into colours", "Soil", "Moonlight only"],
  ]],
  ["Science", "Animals", [
    ["Animals need habitats", "Habitat woh jagah hai jahan animal ko food, water aur shelter milta hai.", "Pond frog ko paani ke paas food aur safe jagah milti hai.", "Ek animal choose karo aur uske habitat ke food, water, shelter ko labelled picture mein dikhao.", "Habitat animal ko kya deta hai?", "Food, water and shelter", "Only toys", "Only sunlight"],
    ["Body parts help animals", "Animals ke body parts unhe chalne, khane, bachne aur apne environment mein rehne mein madad karte hain.", "Duck ke webbed feet paani mein move karne mein madad karte hain.", "Bird, fish aur cat ke body parts compare karo; har ek ke liye ek useful feature likho.", "Duck ke webbed feet kis kaam aate hain?", "Swimming", "Writing", "Digging every soil"],
    ["Animal life cycles", "Kai animals life ke alag stages se guzarte hain; har stage ka shape aur kaam badal sakta hai.", "Butterfly egg, caterpillar, pupa aur adult stages se guzarti hai.", "Butterfly ke chaar stages ko arrows ke saath paper par sequence mein lagao.", "Caterpillar ke baad butterfly ka kaunsa stage hota hai?", "Pupa", "Egg", "Adult first"],
    ["Food chains connect life", "Food chain dikhati hai ki energy ek living thing se doosri tak kaise jaati hai.", "Grass ko grasshopper, grasshopper ko frog, aur frog ko snake kha sakta hai.", "Local plants aur animals ke examples se ek simple chain banao; arrows energy ki direction dikhayen.", "Grass → grasshopper → frog mein pehla food source kya hai?", "Grass", "Frog", "Stone"],
    ["Care for local wildlife", "Animals ko space, clean water aur respectful distance chahiye hoti hai.", "Park ke birds ko door se observe karna unhe disturb karne se behtar hai.", "Ek safe wildlife rule likho aur batao ki usse animal ko kaise help milti hai.", "Wild animal ko dekhte waqt kya karna chahiye?", "Safe distance rakho", "Pakadkar ghar lao", "Use darao"],
  ]],
];

function createLesson(subject, chapter, seed, index) {
  const slug = `${subject}-${chapter}-${seed[0]}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const [title, focus, example, activity, question, correct, wrongOne, wrongTwo] = seed;
  const recap = `${focus} ${example} Is idea ko yaad rakhne ke liye apni notebook mein ek chhota labelled drawing banao. Jab tum apne shabdon mein samjha paate ho, tab tumne sirf answer nahi yaad kiya, balki uska reason bhi samjha.`;
  const transcript = [
    `Namaste! Aaj ka lesson hai ${title}. ${focus} Is baat ko dheere-dheere samjhenge, phir ek aasaan example dekhenge. Learning mein galti hona bilkul normal hai; hum har step ko dobara check kar sakte hain.`,
    `${example} Dhyaan do ki example mein kaunsi cheez badal rahi hai aur kaunsi same rehti hai. Pehle apna andaaza bolo, phir reason dhoondo. Agar tum kisi dost ko samjha sakte ho, to concept aur mazboot ho jaata hai.`,
    `${activity} Apne observation ko ek sentence mein likho. Har number ya label ke saath sahi unit ya naam lagao. Sawaal solve karte waqt jaldi mat karo; clue ko underline karo, apna tareeka chuno, aur aakhir mein jawab ko example ke saath compare karo.`,
    `Ab practice karo: ${question} Thoda rukkar socho. Sahi jawab hai ${correct}. Baaki options kyun fit nahi hote, yeh bhi apne shabdon mein batao. ${recap} Aaj ka chhota recap: ${focus} Agli baar aas-paas ki duniya mein isi idea ka ek aur example dhoondhna.`,
  ].join("\n\n");
  return {
    id: `class5-${slug}`,
    class: 5,
    board: "NCERT",
    subject,
    chapter,
    title,
    description: focus,
    transcript,
    durationSec: 240,
    difficulty: "beginner",
    coverImage: `/media/images/class5-${slug}-cover.svg`,
    diagramImage: `/media/images/class5-${slug}-diagram.svg`,
    audioUrl: null,
    videoUrl: null,
    captionsUrl: `/media/video/class5-${slug}.vtt`,
    keyPoints: [focus, example, activity],
    quiz: [
      { question, choices: [correct, wrongOne, wrongTwo], answer: 0, explanation: focus },
      { question: `Which example matches ${chapter.toLowerCase()}?`, choices: [example, wrongOne, wrongTwo], answer: 0, explanation: example },
      { question: `What is a useful way to practise ${chapter.toLowerCase()}?`, choices: [activity, wrongOne, wrongTwo], answer: 0, explanation: activity },
    ],
    license: "Original StudyAI learning script and generated SVG illustration; no third-party assets.",
    status: "draft - needs teacher review",
    voiceId: ["guru-ji", "didi", "dost", "dada-ji", "master-ji", "story-mode"][index % 6],
  };
}

const additional = [];
for (const [subject, chapter, seeds] of groups) {
  const existingCount = existing.filter((lesson) => lesson.subject === subject && lesson.chapter === chapter).length;
  for (const [index, seed] of seeds.entries()) {
    if (existingCount + index >= 5) continue;
    additional.push(createLesson(subject, chapter, seed, existingCount + index));
  }
}
await mkdir(dirname(extraPath), { recursive: true });
await writeFile(extraPath, `${JSON.stringify(additional, null, 2)}\n`, "utf8");
console.log(`Wrote ${additional.length} original draft lessons to ${extraPath}.`);
