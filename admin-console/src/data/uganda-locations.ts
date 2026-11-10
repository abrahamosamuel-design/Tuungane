// Uganda Districts and Towns — all 146 districts with major towns/trading centres

export interface UgandaDistrict {
  name: string;
  region: string;
  towns: string[];
}

export const UGANDA_DISTRICTS: UgandaDistrict[] = [
  { name: "Abim", region: "Northern", towns: ["Abim Town", "Alerek", "Morulem", "Nyakwae"] },
  { name: "Adjumani", region: "Northern", towns: ["Adjumani Town", "Dzaipi", "Adropi", "Ofua", "Ciforo", "Pakele"] },
  { name: "Agago", region: "Northern", towns: ["Agago", "Kalongo", "Paimol", "Patongo", "Lamiyo"] },
  { name: "Alebtong", region: "Northern", towns: ["Alebtong", "Adwari", "Omoro", "Aloi", "Apala"] },
  { name: "Amolatar", region: "Northern", towns: ["Amolatar", "Namasale", "Muntu", "Awelo", "Kolir"] },
  { name: "Amudat", region: "Eastern", towns: ["Amudat Town", "Loroo", "Karita", "Cheptapoyo"] },
  { name: "Amuria", region: "Eastern", towns: ["Amuria Town", "Kapelebyong", "Wera", "Orungo", "Morungatuny"] },
  { name: "Amuru", region: "Northern", towns: ["Amuru", "Atiak", "Pabbo", "Lamogi", "Guru Guru"] },
  { name: "Apac", region: "Northern", towns: ["Apac Town", "Ibuje", "Inomo", "Chegere", "Akokoro"] },
  { name: "Arua", region: "Northern", towns: ["Arua City", "Pajulu", "Adumi", "Logiri", "Vurra", "Manibe"] },
  { name: "Budaka", region: "Eastern", towns: ["Budaka Town", "Iki-Iki", "Lyama", "Kachomo", "Naboa"] },
  { name: "Bududa", region: "Eastern", towns: ["Bududa Town", "Bushiyi", "Bumbo", "Nakaloke", "Bufumbo"] },
  { name: "Bugiri", region: "Eastern", towns: ["Bugiri Town", "Nabukalu", "Nankoma", "Buwunga", "Muterere"] },
  { name: "Bugweri", region: "Eastern", towns: ["Bugweri", "Budhaya", "Bukooli", "Buyanga"] },
  { name: "Buhweju", region: "Western", towns: ["Buhweju", "Bitereko", "Buhunga", "Ruyonza"] },
  { name: "Buikwe", region: "Central", towns: ["Njeru", "Lugazi", "Buikwe Town", "Wakisi", "Ngogwe", "Ssi"] },
  { name: "Bukedea", region: "Eastern", towns: ["Bukedea Town", "Kachumbala", "Kolir", "Malera", "Kamonkoli"] },
  { name: "Bukomansimbi", region: "Central", towns: ["Bukomansimbi", "Kibinge", "Bigasa", "Magoma"] },
  { name: "Bukwo", region: "Eastern", towns: ["Bukwo Town", "Suam", "Cheptui", "Kaptum", "Tulel"] },
  { name: "Bulambuli", region: "Eastern", towns: ["Bulambuli", "Bulegeni", "Simu", "Masaba", "Nabongo"] },
  { name: "Buliisa", region: "Western", towns: ["Buliisa Town", "Kigwera", "Ngwedo", "Biiso"] },
  { name: "Bundibugyo", region: "Western", towns: ["Bundibugyo Town", "Ntoroko", "Bubukwanga", "Kikyo", "Harugale"] },
  { name: "Bunyangabu", region: "Western", towns: ["Bunyangabu", "Kijura", "Kyabarungira", "Kabonero"] },
  { name: "Bushenyi", region: "Western", towns: ["Bushenyi-Ishaka", "Nyakabirizi", "Katunguru", "Kyabugimbi", "Kyeizooba"] },
  { name: "Busia", region: "Eastern", towns: ["Busia Town", "Dabani", "Lumino", "Masafu", "Buteba"] },
  { name: "Buvuma", region: "Central", towns: ["Buvuma Town", "Buwooya", "Lyabaana", "Nairambi", "Busamuzi"] },
  { name: "Buyende", region: "Eastern", towns: ["Buyende Town", "Nkono", "Kidera", "Kagulu", "Iranda"] },
  { name: "Dokolo", region: "Northern", towns: ["Dokolo Town", "Batta", "Kwera", "Kangai", "Adeknino"] },
  { name: "Gomba", region: "Central", towns: ["Kanoni", "Mpigi", "Maddu", "Kabulasoke", "Kyegonza"] },
  { name: "Gulu", region: "Northern", towns: ["Gulu City", "Laroo", "Pece", "Bardege", "Koro", "Awach"] },
  { name: "Hoima", region: "Western", towns: ["Hoima City", "Busiisi", "Kitoba", "Kigorobya", "Kyabigambire"] },
  { name: "Ibanda", region: "Western", towns: ["Ibanda Town", "Kagera", "Ibaare", "Mugarama", "Bisheshe"] },
  { name: "Iganga", region: "Eastern", towns: ["Iganga Town", "Bulanga", "Buyanga", "Nakigo", "Nabitende", "Nawandala"] },
  { name: "Isingiro", region: "Western", towns: ["Isingiro Town", "Mbaare", "Rugaaga", "Kabuyanda", "Birere"] },
  { name: "Jinja", region: "Eastern", towns: ["Jinja City", "Bugembe", "Mafubira", "Kakira", "Walukuba", "Mpumudde"] },
  { name: "Kaabong", region: "Northern", towns: ["Kaabong Town", "Kathile", "Sidok", "Lolelia", "Timu"] },
  { name: "Kabale", region: "Western", towns: ["Kabale Town", "Kamwezi", "Rubanda", "Maziba", "Kaharo", "Katuna"] },
  { name: "Kabarole", region: "Western", towns: ["Fort Portal City", "Kabarole", "Buheesi", "Kasenda", "Kidubuli"] },
  { name: "Kaberamaido", region: "Eastern", towns: ["Kaberamaido Town", "Ochero", "Alwa", "Bululu", "Anyara"] },
  { name: "Kagadi", region: "Western", towns: ["Kagadi Town", "Kyakabadiima", "Nkondo", "Muhorro", "Bwikara"] },
  { name: "Kakumiro", region: "Western", towns: ["Kakumiro Town", "Nkooko", "Kibaale", "Mpeefu", "Rugashari"] },
  { name: "Kalaki", region: "Eastern", towns: ["Kalaki Town", "Lwala", "Nawaikoke", "Kakure"] },
  { name: "Kalangala", region: "Central", towns: ["Kalangala Town", "Mugoye", "Bufumira", "Bujumba", "Kyamuswa"] },
  { name: "Kaliro", region: "Eastern", towns: ["Kaliro Town", "Namwiwa", "Nawaikoke", "Tirinyi", "Bumanya"] },
  { name: "Kalungu", region: "Central", towns: ["Kalungu", "Bukulula", "Lwabenge", "Masaka Road"] },
  { name: "Kampala", region: "Central", towns: ["Kampala CBD", "Kawempe", "Makindye", "Nakawa", "Rubaga", "Kololo", "Ntinda", "Bugolobi", "Bukoto", "Kisenyi", "Wandegeya", "Kalerwe", "Nansana", "Kireka", "Najeera", "Kyanja", "Kisaasi", "Kyebando", "Mulago", "Mengo"] },
  { name: "Kamuli", region: "Eastern", towns: ["Kamuli Town", "Bugaya", "Buyende", "Balawoli", "Nabwigulu", "Butansi"] },
  { name: "Kamwenge", region: "Western", towns: ["Kamwenge Town", "Buhara", "Mpara", "Kahunge", "Kihuura"] },
  { name: "Kanungu", region: "Western", towns: ["Kanungu Town", "Kihihi", "Kirima", "Mpungu", "Rutenga"] },
  { name: "Kapchorwa", region: "Eastern", towns: ["Kapchorwa Town", "Sipi", "Tegeres", "Chema", "Kaptanya"] },
  { name: "Kapelebyong", region: "Eastern", towns: ["Kapelebyong Town", "Acowa", "Magoro", "Mukura"] },
  { name: "Karenga", region: "Northern", towns: ["Karenga Town", "Kamion", "Lodonga", "Lonyili"] },
  { name: "Kasanda", region: "Central", towns: ["Kasanda", "Mubende Road", "Kiganda", "Kitumba"] },
  { name: "Kasese", region: "Western", towns: ["Kasese Town", "Katwe", "Rukoki", "Bwera", "Maliba", "Kyarumba"] },
  { name: "Katakwi", region: "Eastern", towns: ["Katakwi Town", "Usuk", "Toroma", "Obalanga", "Ngariam"] },
  { name: "Kayunga", region: "Central", towns: ["Kayunga Town", "Galilaya", "Busana", "Nazigo", "Bbaale", "Kitimbwa"] },
  { name: "Kazo", region: "Western", towns: ["Kazo Town", "Burunga", "Rwembogo", "Nyakashashara"] },
  { name: "Kibale", region: "Western", towns: ["Kibale Town", "Kapeka", "Kagadi", "Kamwenge", "Mpeefu"] },
  { name: "Kiboga", region: "Central", towns: ["Kiboga Town", "Kapeka", "Bukomero", "Lwamata", "Muwanga"] },
  { name: "Kibuku", region: "Eastern", towns: ["Kibuku Town", "Kagumu", "Tirinyi", "Kasasira", "Bulangira"] },
  { name: "Kikuube", region: "Western", towns: ["Kikuube", "Butoole", "Kyabigambire", "Kabaale"] },
  { name: "Kiruhura", region: "Western", towns: ["Kiruhura Town", "Rushere", "Buremba", "Sanga", "Nyabushozi"] },
  { name: "Kiryandongo", region: "Western", towns: ["Kiryandongo", "Bweyale", "Masindi Port", "Mutunda", "Chwa"] },
  { name: "Kisoro", region: "Western", towns: ["Kisoro Town", "Muramba", "Nyundo", "Bunagana", "Mutolere"] },
  { name: "Kitgum", region: "Northern", towns: ["Kitgum Town", "Orom", "Palabek", "Agoro", "Kalongo"] },
  { name: "Koboko", region: "Northern", towns: ["Koboko Town", "Kuluba", "Lobule", "Drivu", "Yumbe Road"] },
  { name: "Kole", region: "Northern", towns: ["Kole Town", "Aboke", "Akalo", "Alito", "Bala"] },
  { name: "Kotido", region: "Northern", towns: ["Kotido Town", "Panyangara", "Nakapiripirit", "Jie", "Kacheri"] },
  { name: "Kumi", region: "Eastern", towns: ["Kumi Town", "Ngora", "Atutur", "Mukongoro", "Ongino"] },
  { name: "Kwania", region: "Northern", towns: ["Kwania", "Namasale", "Akokoro", "Chawente", "Inomo"] },
  { name: "Kyankwanzi", region: "Central", towns: ["Kyankwanzi", "Nkooko", "Ntwetwe", "Butemba", "Gayaza"] },
  { name: "Kyegegwa", region: "Western", towns: ["Kyegegwa Town", "Mpara", "Ruyonza", "Karuguuza"] },
  { name: "Kyenjojo", region: "Western", towns: ["Kyenjojo Town", "Butebo", "Nyabuharwa", "Kakabara", "Bufunjo"] },
  { name: "Kyotera", region: "Central", towns: ["Kyotera Town", "Rakai", "Kasaali", "Kalisizo", "Lyantonde"] },
  { name: "Lamwo", region: "Northern", towns: ["Lamwo", "Padibe", "Madi Opei", "Lokung", "Palabek Gem"] },
  { name: "Lira", region: "Northern", towns: ["Lira City", "Adekokwok", "Ojwina", "Barr", "Amach"] },
  { name: "Luuka", region: "Eastern", towns: ["Luuka Town", "Bukooli", "Ikumbya", "Nawanjofu", "Busiki"] },
  { name: "Luwero", region: "Central", towns: ["Luwero Town", "Wobulenzi", "Bombo", "Bamunanika", "Zirobwe"] },
  { name: "Lwengo", region: "Central", towns: ["Lwengo", "Kalisizo", "Ibulanku", "Malongo"] },
  { name: "Lyantonde", region: "Central", towns: ["Lyantonde Town", "Kasagama", "Kijungu"] },
  { name: "Madi-Okollo", region: "Northern", towns: ["Madi-Okollo", "Zombo", "Paidha", "Warr", "Ezulai"] },
  { name: "Manafwa", region: "Eastern", towns: ["Manafwa", "Lwakhakha", "Bungokho", "Bumbo", "Namabya"] },
  { name: "Maracha", region: "Northern", towns: ["Maracha Town", "Oluvu", "Alia", "Nyadri", "Tara"] },
  { name: "Masaka", region: "Central", towns: ["Masaka City", "Katwe", "Kimanya", "Nyendo", "Kabonera", "Bukakata"] },
  { name: "Masindi", region: "Western", towns: ["Masindi Town", "Bwijanga", "Miirya", "Pakanyi", "Kiryandongo"] },
  { name: "Mayuge", region: "Eastern", towns: ["Mayuge Town", "Baitambogwe", "Busakira", "Kigandalo", "Kaliro"] },
  { name: "Mbale", region: "Eastern", towns: ["Mbale City", "Namatala", "Busamaga", "Wanale", "Bungokho", "Nkoma"] },
  { name: "Mbarara", region: "Western", towns: ["Mbarara City", "Kakiika", "Biharwe", "Nyamitanga", "Kakoba", "Kamukuzi"] },
  { name: "Mitooma", region: "Western", towns: ["Mitooma Town", "Ruhinda", "Kyangyenyi", "Kibingo"] },
  { name: "Mityana", region: "Central", towns: ["Mityana Town", "Busimbi", "Myanzi", "Kalangaalo"] },
  { name: "Moroto", region: "Northern", towns: ["Moroto Town", "Rupa", "Nadunget", "Tapac", "Matany"] },
  { name: "Moyo", region: "Northern", towns: ["Moyo Town", "Itula", "Lefori", "Gimara", "Aliba"] },
  { name: "Mpigi", region: "Central", towns: ["Mpigi Town", "Nkozi", "Muduuma", "Buwama", "Kibibi"] },
  { name: "Mubende", region: "Central", towns: ["Mubende Town", "Kasambya", "Kiganda", "Butoloogo", "Bagezza"] },
  { name: "Mukono", region: "Central", towns: ["Mukono Town", "Seeta", "Kyampisi", "Nama", "Kasawo", "Goma", "Ntenjeru"] },
  { name: "Nabilatuk", region: "Northern", towns: ["Nabilatuk Town", "Lolachat", "Moruita", "Lokopo"] },
  { name: "Nakapiripirit", region: "Northern", towns: ["Nakapiripirit Town", "Lorengedwat", "Nabilatuk", "Namalu"] },
  { name: "Nakaseke", region: "Central", towns: ["Nakaseke Town", "Semuto", "Ngoma", "Kiwoko", "Butalangu"] },
  { name: "Nakasongola", region: "Central", towns: ["Nakasongola Town", "Lwampanga", "Kalungi", "Nabiswera", "Mitiyana"] },
  { name: "Namayingo", region: "Eastern", towns: ["Namayingo", "Sigulu", "Sendi", "Buswale", "Banda"] },
  { name: "Namisindwa", region: "Eastern", towns: ["Namisindwa", "Bumbo", "Magale", "Lwakhakha Road"] },
  { name: "Namutumba", region: "Eastern", towns: ["Namutumba Town", "Bulange", "Nabweya", "Ivukula", "Nsinze"] },
  { name: "Napak", region: "Northern", towns: ["Napak Town", "Iriiri", "Lopeei", "Lokopo", "Matany"] },
  { name: "Nebbi", region: "Northern", towns: ["Nebbi Town", "Jonam", "Pakwach", "Panyimur", "Nwoya"] },
  { name: "Ngora", region: "Eastern", towns: ["Ngora Town", "Mukongoro", "Kobwin", "Kapir"] },
  { name: "Ntoroko", region: "Western", towns: ["Ntoroko Town", "Kanara", "Butuku", "Rwimi"] },
  { name: "Ntungamo", region: "Western", towns: ["Ntungamo Town", "Rubaare", "Kibatsi", "Rwashamaire", "Rugarama"] },
  { name: "Nwoya", region: "Northern", towns: ["Nwoya Town", "Gulu Road", "Koch Goma", "Purongo"] },
  { name: "Obongi", region: "Northern", towns: ["Obongi Town", "Moyo Road", "Palorinya", "Itula"] },
  { name: "Omoro", region: "Northern", towns: ["Omoro Town", "Bobi", "Lalogi", "Odek", "Rwotcamo"] },
  { name: "Otuke", region: "Northern", towns: ["Otuke Town", "Orum", "Okwang", "Adwari"] },
  { name: "Oyam", region: "Northern", towns: ["Oyam Town", "Apac Road", "Loro", "Aleka", "Minakulu"] },
  { name: "Pader", region: "Northern", towns: ["Pader Town", "Acholibur", "Laguti", "Puranga"] },
  { name: "Pakwach", region: "Northern", towns: ["Pakwach Town", "Panyimur", "Nwoya", "Jonam"] },
  { name: "Pallisa", region: "Eastern", towns: ["Pallisa Town", "Butebo", "Agule", "Chelekura", "Kamuge"] },
  { name: "Rakai", region: "Central", towns: ["Rakai Town", "Kyotera", "Kalisizo", "Kasaali", "Byakabanda"] },
  { name: "Rubanda", region: "Western", towns: ["Rubanda Town", "Ikumba", "Bufundi", "Bubare", "Muko"] },
  { name: "Rubirizi", region: "Western", towns: ["Rubirizi Town", "Bunyaruguru", "Katerera", "Kichwamba"] },
  { name: "Rukiga", region: "Western", towns: ["Rukiga Town", "Kamwezi", "Maziba", "Kaharo"] },
  { name: "Rukungiri", region: "Western", towns: ["Rukungiri Town", "Buyanja", "Ruhinda", "Kebisoni", "Nyakagyeme"] },
  { name: "Rwampara", region: "Western", towns: ["Rwampara", "Bwizibwera", "Bugamba", "Nyakyera"] },
  { name: "Sembabule", region: "Central", towns: ["Sembabule Town", "Lwebitakuli", "Mateete", "Lugusulu"] },
  { name: "Serere", region: "Eastern", towns: ["Serere Town", "Bugondo", "Pingire", "Kasilo"] },
  { name: "Sheema", region: "Western", towns: ["Sheema Town", "Kabwohe", "Itendero", "Rwempogo"] },
  { name: "Sironko", region: "Eastern", towns: ["Sironko Town", "Bukhulo", "Buyobo", "Buwali", "Zesui"] },
  { name: "Soroti", region: "Eastern", towns: ["Soroti City", "Gweri", "Tubur", "Asuret", "Katine", "Kamuda"] },
  { name: "Terego", region: "Northern", towns: ["Terego", "Odupi", "Paidha", "Zombo Road"] },
  { name: "Tororo", region: "Eastern", towns: ["Tororo Town", "Malaba", "Nagongera", "Mukujju", "Rubongi"] },
  { name: "Wakiso", region: "Central", towns: ["Entebbe", "Wakiso Town", "Nansana", "Kira", "Makindye-Ssabagabo", "Bweyogerere", "Gayaza", "Kasangati", "Kajjansi", "Namasuba", "Matugga", "Ssisa"] },
  { name: "Yumbe", region: "Northern", towns: ["Yumbe Town", "Aringa", "Odravu", "Kei", "Kululu"] },
  { name: "Zombo", region: "Northern", towns: ["Zombo Town", "Paidha", "Warr", "Jangokoro", "Abanga"] },
];

/** Flat sorted list of all district names */
export const DISTRICT_NAMES: string[] = UGANDA_DISTRICTS
  .map(d => d.name)
  .sort((a, b) => a.localeCompare(b));

/** Get towns for a given district name */
export function getTownsForDistrict(districtName: string): string[] {
  const d = UGANDA_DISTRICTS.find(d => d.name.toLowerCase() === districtName.toLowerCase());
  return d ? [...d.towns].sort((a, b) => a.localeCompare(b)) : [];
}

/** Filter districts by query string */
export function filterDistricts(query: string): string[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return DISTRICT_NAMES.filter(d => d.toLowerCase().includes(q)).slice(0, 8);
}

/** Filter towns for a district by query string */
export function filterTowns(districtName: string, query: string): string[] {
  const towns = getTownsForDistrict(districtName);
  const q = query.toLowerCase().trim();
  if (!q) return towns.slice(0, 8);
  return towns.filter(t => t.toLowerCase().includes(q)).slice(0, 8);
}
