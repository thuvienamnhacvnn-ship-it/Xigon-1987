/**
 * The menu.
 *
 * What is real here, and what is not — because it matters:
 *
 *   • The dish names, the shape of the card, the photographs and the four
 *     signature plates X1–X4 come from the restaurant's own website
 *     (1987xigon.de, read 08.09.2026) and the PDF card linked from it.
 *   • The **prices are sample prices for this demo**. The old website and the
 *     old PDF give different numbers for X1–X4 (9,50 € vs 19,00 € and so on),
 *     and the PDF gives no usable prices for the rest of the card, so there is
 *     no honest single source to copy.
 *
 * Every dish therefore carries `priceConfirmed: false` and a `sourceNote`
 * saying so. The interface renders that note wherever a price appears, and the
 * whole site runs in demo mode until the restaurant confirms its real card.
 * The prices make the cart, the checkout and the receipts work; they are not
 * claimed to be what the restaurant charges.
 *
 * The photographs in `public/img/dish` are the restaurant's own. Several of
 * them show plates the old card never named, so dishes were added here to give
 * every photograph a home rather than leave the pictures unused. Those names
 * and descriptions say what is visible in the picture — they are not a card the
 * restaurant has confirmed, and they claim nothing about origin, preparation or
 * allergens. Dishes with no photograph keep `photoId` unset; no mapping is
 * guessed.
 */

export type SeedVariant = {
  labelDe: string;
  labelEn?: string;
  labelVi?: string;
  priceCents: number;
  sort?: number;
  isDefault?: boolean;
  /** Drinks and table-service dishes are never sent out for collection. */
  orderable?: boolean;
};

export type SeedDish = {
  slug: string;
  code?: string;
  nameDe: string;
  nameEn?: string;
  nameVi?: string;
  descriptionDe?: string;
  descriptionEn?: string;
  descriptionVi?: string;
  ingredientsDe?: string;
  ingredientsEn?: string;
  ingredientsVi?: string;
  /** An id in public/img/dish — the restaurant's own photograph of the plate. */
  photoId?: string;
  plateId?: string;
  sceneId?: string;
  vegetarian?: boolean;
  vegan?: boolean;
  spice?: number;
  featured?: boolean;
  sourceNote?: string;
  variants: SeedVariant[];
};

export type SeedCategory = {
  slug: string;
  nameDe: string;
  nameEn: string;
  nameVi: string;
  noteDe?: string;
  noteEn?: string;
  noteVi?: string;
  dishes: SeedDish[];
};

/** Attached to every dish, and shown in the interface next to the price. */
export const PRICE_NOTE = {
  de: 'Demo-Preis. Die alte Website und die alte PDF-Karte nennen unterschiedliche Preise; die echte Karte ist noch nicht bestätigt.',
  en: 'Demo price. The old website and the old PDF card give different prices; the real card is not confirmed yet.',
  vi: 'Giá demo. Web cũ và bản PDF cũ ghi giá khác nhau; menu thật chưa được xác nhận.',
};

const NOTE = PRICE_NOTE.de;

const portion = (priceCents: number, orderable = true): SeedVariant[] => [
  { labelDe: 'Portion', labelEn: 'Portion', labelVi: 'Phần', priceCents, isDefault: true, orderable },
];

export const CATEGORIES: SeedCategory[] = [
  {
    slug: 'signatures',
    nameDe: 'Signatures',
    nameEn: 'Signatures',
    nameVi: 'Món đặc trưng',
    noteDe: 'Die vier Teller, für die das Haus bekannt ist. Am Tisch fertig zubereitet.',
    noteEn: 'The four plates the house is known for. Finished at your table.',
    noteVi: 'Bốn món làm nên tên tuổi của quán. Hoàn tất ngay tại bàn.',
    dishes: [
      {
        slug: 'green-hot-plate',
        code: 'X1',
        nameDe: 'Green Hot Plate',
        nameEn: 'Green Hot Plate',
        nameVi: 'Green Hot Plate',
        descriptionDe:
          'Grünes Gemüse und Kräuter auf der heißen Platte, am Tisch fertig gegart. Kommt zischend an — und riecht, bevor man ihn sieht.',
        descriptionEn:
          'Green vegetables and herbs on the hot plate, finished at your table. It arrives sizzling, and you smell it before you see it.',
        descriptionVi:
          'Rau xanh và rau thơm trên đĩa nóng, hoàn tất ngay tại bàn. Mang ra vẫn xèo xèo, ngửi thấy trước khi nhìn thấy.',
        ingredientsDe: 'Pak Choi, Bohnen, Brokkoli, Knoblauch, Chili, Sesamöl, Sojasauce',
        ingredientsEn: 'Pak choi, beans, broccoli, garlic, chilli, sesame oil, soy sauce',
        ingredientsVi: 'Cải thìa, đậu que, súp lơ xanh, tỏi, ớt, dầu mè, nước tương',
        photoId: 'signature-turm',
        vegetarian: true,
        spice: 1,
        sourceNote: NOTE,
        variants: portion(1900),
      },
      {
        slug: 'beef-on-fire',
        code: 'X2',
        nameDe: 'Beef on Fire',
        nameEn: 'Beef on Fire',
        nameVi: 'Beef on Fire',
        descriptionDe: 'Rindfleisch über offener Flamme, mit Kräutern, Zwiebeln und Pfeffer aus dem Mörser.',
        descriptionEn: 'Beef over an open flame, with herbs, onions and pepper from the mortar.',
        descriptionVi: 'Thịt bò nướng trên lửa, kèm rau thơm, hành và tiêu giã.',
        ingredientsDe: 'Rinderfilet, Zwiebeln, Zitronengras, Chili, Pfeffer',
        ingredientsEn: 'Beef fillet, onions, lemongrass, chilli, pepper',
        ingredientsVi: 'Thăn bò, hành tây, sả, ớt, tiêu',
        photoId: 'rinderfilet',
        spice: 2,
        sourceNote: NOTE,
        variants: portion(2200),
      },
      {
        slug: 'kiss-of-smoke',
        code: 'X3',
        nameDe: 'Kiss of Smoke',
        nameEn: 'Kiss of Smoke',
        nameVi: 'Kiss of Smoke',
        descriptionDe: 'Unter der Glocke geräuchert. Geöffnet wird sie erst am Tisch.',
        descriptionEn: 'Smoked under the cloche. It is lifted at your table, not in the kitchen.',
        descriptionVi: 'Xông khói dưới nắp chụp. Nắp chỉ mở ngay tại bàn, không mở trong bếp.',
        ingredientsDe: 'Ente, Kirschholzrauch, Hoisin, Frühlingszwiebeln',
        ingredientsEn: 'Duck, cherrywood smoke, hoisin, spring onions',
        ingredientsVi: 'Vịt, khói gỗ anh đào, tương hoisin, hành lá',
        photoId: 'entenbrust',
        sourceNote: NOTE,
        variants: portion(2600),
      },
      {
        slug: 'king-prawns-meets-scallops',
        code: 'X4',
        nameDe: 'King Prawns meets Scallops',
        nameEn: 'King prawns meets scallops',
        nameVi: 'Tôm sú gặp sò điệp',
        descriptionDe: 'Garnelen und Jakobsmuscheln, kurz und heiß gebraten, mit Limettenbutter.',
        descriptionEn: 'King prawns and scallops, seared hot and briefly, with lime butter.',
        descriptionVi: 'Tôm sú và sò điệp áp chảo nhanh trên lửa lớn, kèm bơ chanh.',
        ingredientsDe: 'Garnelen, Jakobsmuscheln, Limette, Butter, Knoblauch',
        ingredientsEn: 'King prawns, scallops, lime, butter, garlic',
        ingredientsVi: 'Tôm sú, sò điệp, chanh, bơ, tỏi',
        photoId: 'surf-and-turf',
        sourceNote: NOTE,
        variants: portion(2400),
      },
    ],
  },

  {
    slug: 'sushi',
    nameDe: 'Sushi',
    nameEn: 'Sushi',
    nameVi: 'Sushi',
    noteDe: 'Maki, Inside-out, Nigiri und Sashimi.',
    noteEn: 'Maki, inside-out, nigiri and sashimi.',
    noteVi: 'Maki, inside-out, nigiri và sashimi.',
    dishes: [
      {
        slug: 'sushi-platte',
        nameDe: 'Sushi-Platte des Hauses',
        nameEn: 'Sushi platter of the house',
        nameVi: 'Khay sushi của quán',
        descriptionDe: 'Gemischte Platte aus Maki, Nigiri und Sashimi. Für zwei gedacht, für vier zu schaffen.',
        descriptionEn: 'A mixed platter of maki, nigiri and sashimi. Meant for two, manageable by four.',
        descriptionVi: 'Khay tổng hợp maki, nigiri và sashimi. Tính cho hai người, bốn người vẫn đủ.',
        ingredientsDe: 'Lachs, Thunfisch, Avocado, Gurke, Sushireis, Nori',
        ingredientsEn: 'Salmon, tuna, avocado, cucumber, sushi rice, nori',
        ingredientsVi: 'Cá hồi, cá ngừ, bơ, dưa chuột, cơm sushi, rong biển',
        photoId: 'xigon-platte',
        plateId: 'sushi-platter',
        featured: true,
        sourceNote: NOTE,
        variants: [
          { labelDe: 'Klein (18 Stück)', labelEn: 'Small (18 pieces)', labelVi: 'Nhỏ (18 miếng)', priceCents: 2800, isDefault: true },
          { labelDe: 'Groß (32 Stück)', labelEn: 'Large (32 pieces)', labelVi: 'Lớn (32 miếng)', priceCents: 4600, sort: 1 },
        ],
      },
      {
        slug: 'maki-lachs',
        nameDe: 'Maki Lachs',
        nameEn: 'Salmon maki',
        nameVi: 'Maki cá hồi',
        descriptionDe: 'Klassische Rolle in Nori, auf der Bambusmatte gerollt.',
        descriptionEn: 'The classic roll in nori, rolled on the bamboo mat.',
        descriptionVi: 'Cuốn cổ điển với rong biển nori, cuốn trên mành tre.',
        ingredientsDe: 'Lachs, Sushireis, Nori',
        ingredientsEn: 'Salmon, sushi rice, nori',
        ingredientsVi: 'Cá hồi, cơm sushi, rong biển',
        photoId: 'nigiri-lachs',
        plateId: 'sushi-roll',
        featured: true,
        sourceNote: NOTE,
        variants: [
          { labelDe: '6 Stück', labelEn: '6 pieces', labelVi: '6 miếng', priceCents: 720, isDefault: true },
          { labelDe: '12 Stück', labelEn: '12 pieces', labelVi: '12 miếng', priceCents: 1320 },
        ],
      },
      {
        slug: 'maki-avocado',
        nameDe: 'Maki Avocado',
        nameEn: 'Avocado maki',
        nameVi: 'Maki bơ',
        descriptionDe: 'Vegan, ohne Kompromiss beim Reis.',
        descriptionEn: 'Vegan, with no compromise on the rice.',
        descriptionVi: 'Món chay thuần, cơm vẫn làm chuẩn.',
        ingredientsDe: 'Avocado, Sushireis, Nori, Sesam',
        ingredientsEn: 'Avocado, sushi rice, nori, sesame',
        ingredientsVi: 'Bơ, cơm sushi, rong biển, mè',
        photoId: 'nigiri-avocado',
        vegetarian: true,
        vegan: true,
        sourceNote: NOTE,
        variants: [
          { labelDe: '6 Stück', labelEn: '6 pieces', labelVi: '6 miếng', priceCents: 620, isDefault: true },
          { labelDe: '12 Stück', labelEn: '12 pieces', labelVi: '12 miếng', priceCents: 1140 },
        ],
      },
      {
        slug: 'sashimi-auswahl',
        nameDe: 'Sashimi-Auswahl',
        nameEn: 'Sashimi selection',
        nameVi: 'Sashimi tuyển chọn',
        descriptionDe: 'Roher Fisch, dünn geschnitten, ohne Reis. Was heute gut ist, entscheidet die Küche.',
        descriptionEn: 'Raw fish, thinly sliced, no rice. What is good today is the kitchen’s call.',
        descriptionVi: 'Cá sống thái lát mỏng, không cơm. Hôm nay có gì ngon do bếp quyết.',
        ingredientsDe: 'Lachs, Thunfisch, Wasabi, eingelegter Ingwer',
        ingredientsEn: 'Salmon, tuna, wasabi, pickled ginger',
        ingredientsVi: 'Cá hồi, cá ngừ, wasabi, gừng ngâm',
        photoId: 'tisch-lachs',
        sceneId: 'sushi-bench',
        sourceNote: NOTE,
        variants: [
          { labelDe: '9 Stück', labelEn: '9 pieces', labelVi: '9 miếng', priceCents: 1980, isDefault: true },
        ],
      },
      {
        slug: 'tempura-hot-roll',
        nameDe: 'Tempura Hot Roll',
        nameEn: 'Tempura hot roll',
        nameVi: 'Cuốn tempura nóng',
        descriptionDe: 'Frittierte Rolle, warm serviert, mit Spicy Mayo.',
        descriptionEn: 'Deep-fried roll, served warm, with spicy mayo.',
        descriptionVi: 'Cuốn chiên giòn, ăn nóng, kèm sốt mayo cay.',
        ingredientsDe: 'Garnele, Tempurateig, Spicy Mayo, Frühlingszwiebeln',
        ingredientsEn: 'Prawn, tempura batter, spicy mayo, spring onions',
        ingredientsVi: 'Tôm, bột tempura, mayo cay, hành lá',
        photoId: 'inside-out-rolle',
        spice: 2,
        sourceNote: NOTE,
        variants: [{ labelDe: '8 Stück', labelEn: '8 pieces', labelVi: '8 miếng', priceCents: 1480, isDefault: true }],
      },
    ],
  },

  {
    slug: 'vorspeisen',
    nameDe: 'Vorspeisen',
    nameEn: 'Starters',
    nameVi: 'Khai vị',
    dishes: [
      {
        slug: 'austern',
        nameDe: 'Austern',
        nameEn: 'Oysters',
        nameVi: 'Hàu',
        descriptionDe: 'Auf Eis, mit Kaviar und Limette. Drei oder sechs.',
        descriptionEn: 'On ice, with caviar and lime. Three or six.',
        descriptionVi: 'Trên đá, kèm trứng cá và chanh. Ba hoặc sáu con.',
        ingredientsDe: 'Austern, Kaviar, Limette, Schalotten',
        ingredientsEn: 'Oysters, caviar, lime, shallots',
        ingredientsVi: 'Hàu, trứng cá, chanh, hành tím',
        plateId: 'oysters',
        featured: true,
        sourceNote: NOTE,
        variants: [
          { labelDe: '3 Stück', labelEn: '3 pieces', labelVi: '3 con', priceCents: 1500, isDefault: true },
          { labelDe: '6 Stück', labelEn: '6 pieces', labelVi: '6 con', priceCents: 2800 },
        ],
      },
      {
        slug: 'sommerrollen',
        nameDe: 'Sommerrollen',
        nameEn: 'Summer rolls',
        nameVi: 'Gỏi cuốn',
        descriptionDe: 'Reispapier, Kräuter, Salat — kalt serviert, mit Erdnusssauce.',
        descriptionEn: 'Rice paper, herbs, salad — served cold, with peanut sauce.',
        descriptionVi: 'Bánh tráng, rau thơm, xà lách — ăn nguội, chấm tương đậu phộng.',
        ingredientsDe: 'Reispapier, Salat, Minze, Koriander, Erdnusssauce',
        ingredientsEn: 'Rice paper, salad, mint, coriander, peanut sauce',
        ingredientsVi: 'Bánh tráng, xà lách, húng, ngò, tương đậu phộng',
        photoId: 'sommerrollen',
        vegetarian: true,
        sourceNote: NOTE,
        variants: [{ labelDe: '2 Stück', labelEn: '2 pieces', labelVi: '2 cuốn', priceCents: 680, isDefault: true }],
      },
      {
        slug: 'gyoza',
        nameDe: 'Gyoza',
        nameEn: 'Gyoza',
        nameVi: 'Gyoza',
        descriptionDe: 'Auf einer Seite gebraten, auf der anderen gedämpft.',
        descriptionEn: 'Fried on one side, steamed on the other.',
        descriptionVi: 'Một mặt áp chảo, một mặt hấp.',
        ingredientsDe: 'Hackfleisch, Kohl, Ingwer, Sojasauce',
        ingredientsEn: 'Minced meat, cabbage, ginger, soy sauce',
        ingredientsVi: 'Thịt băm, bắp cải, gừng, nước tương',
        sourceNote: NOTE,
        variants: [{ labelDe: '5 Stück', labelEn: '5 pieces', labelVi: '5 cái', priceCents: 780, isDefault: true }],
      },
      {
        slug: 'tempura-garnelen',
        nameDe: 'Tempura-Garnelen',
        nameEn: 'Tempura prawns',
        nameVi: 'Tôm tempura',
        descriptionDe: 'Drei ausgebackene Garnelen auf dunklem Teller, mit heller Sauce und Kräuterblättern angerichtet.',
        descriptionEn: 'Three battered prawns on a dark plate, arranged with a pale sauce and herb leaves.',
        descriptionVi: 'Ba con tôm chiên giòn trên đĩa sẫm màu, rưới sốt màu nhạt và điểm lá thơm.',
        photoId: 'tempura-garnelen',
        sourceNote: NOTE,
        variants: portion(1180),
      },
      {
        slug: 'papayasalat',
        nameDe: 'Papayasalat',
        nameEn: 'Papaya salad',
        nameVi: 'Gỏi đu đủ',
        descriptionDe: 'Grüner Salat mit Papayastreifen, Radieschen, Tomaten und Granatapfelkernen in einem hellen Dressing.',
        descriptionEn: 'Green salad with papaya strips, radish, tomatoes and pomegranate seeds in a light dressing.',
        descriptionVi: 'Gỏi xanh với đu đủ bào sợi, củ cải đỏ, cà chua và hạt lựu, trộn nước sốt màu nhạt.',
        photoId: 'papayasalat',
        vegetarian: true,
        vegan: true,
        sourceNote: NOTE,
        variants: portion(890),
      },
      {
        slug: 'gemischter-salat',
        nameDe: 'Gemischter Salat',
        nameEn: 'Mixed salad',
        nameVi: 'Xà lách trộn',
        descriptionDe: 'Gemischte Blattsalate mit Tomaten, Radieschen und Kräutern, in einer Schale aus Steinzeug serviert.',
        descriptionEn: 'Mixed leaf salad with tomatoes, radish and herbs, served in a stoneware bowl.',
        descriptionVi: 'Xà lách trộn cùng cà chua, củ cải đỏ và rau thơm, dọn trong tô gốm.',
        photoId: 'tisch-salat',
        vegetarian: true,
        vegan: true,
        sourceNote: NOTE,
        variants: portion(780),
      },
    ],
  },

  {
    slug: 'suppen',
    nameDe: 'Suppen',
    nameEn: 'Soups',
    nameVi: 'Món nước',
    noteDe: 'Die Brühen ziehen über Nacht.',
    noteEn: 'The broths are drawn overnight.',
    noteVi: 'Nước dùng ninh qua đêm.',
    dishes: [
      {
        slug: 'pho-rind',
        nameDe: 'Phở mit Rind',
        nameEn: 'Phở with beef',
        nameVi: 'Phở bò',
        descriptionDe: 'Reisbandnudeln, Rinderbrühe, Kräuter, Limette. Chili kommt separat.',
        descriptionEn: 'Rice noodles, beef broth, herbs, lime. The chilli comes separately.',
        descriptionVi: 'Bánh phở, nước dùng bò, rau thơm, chanh. Ớt để riêng.',
        ingredientsDe: 'Rinderbrühe, Reisbandnudeln, Rindfleisch, Zwiebeln, Koriander, Limette',
        ingredientsEn: 'Beef broth, rice noodles, beef, onions, coriander, lime',
        ingredientsVi: 'Nước dùng bò, bánh phở, thịt bò, hành, ngò, chanh',
        spice: 1,
        sourceNote: NOTE,
        variants: [{ labelDe: 'Schale', labelEn: 'Bowl', labelVi: 'Tô', priceCents: 1380, isDefault: true }],
      },
      {
        slug: 'pho-gemuese',
        nameDe: 'Phở mit Gemüse',
        nameEn: 'Phở with vegetables',
        nameVi: 'Phở chay',
        descriptionDe: 'Gemüsebrühe, gleiche Nudeln, gleiche Kräuter.',
        descriptionEn: 'Vegetable broth, the same noodles, the same herbs.',
        descriptionVi: 'Nước dùng rau củ, cùng loại bánh phở và rau thơm.',
        ingredientsDe: 'Gemüsebrühe, Reisbandnudeln, Tofu, Pak Choi, Koriander',
        ingredientsEn: 'Vegetable broth, rice noodles, tofu, pak choi, coriander',
        ingredientsVi: 'Nước dùng rau củ, bánh phở, đậu hũ, cải thìa, ngò',
        vegetarian: true,
        vegan: true,
        sourceNote: NOTE,
        variants: [{ labelDe: 'Schale', labelEn: 'Bowl', labelVi: 'Tô', priceCents: 1280, isDefault: true }],
      },
      {
        slug: 'miso-suppe',
        nameDe: 'Miso-Suppe',
        nameEn: 'Miso soup',
        nameVi: 'Súp miso',
        descriptionDe: 'Klare Misobrühe mit Tofuwürfeln, Algen und Frühlingszwiebeln.',
        descriptionEn: 'Clear miso broth with tofu cubes, seaweed and spring onions.',
        descriptionVi: 'Nước súp miso trong với đậu hũ cắt vuông, rong biển và hành lá.',
        photoId: 'miso-suppe',
        vegetarian: true,
        sourceNote: NOTE,
        variants: portion(690),
      },
    ],
  },

  {
    slug: 'hauptgerichte',
    nameDe: 'Hauptgerichte',
    nameEn: 'Main courses',
    nameVi: 'Món chính',
    dishes: [
      {
        slug: 'bun-cha',
        nameDe: 'Bún chả',
        nameEn: 'Bún chả',
        nameVi: 'Bún chả',
        descriptionDe: 'Gegrilltes Schweinefleisch, Reisnudeln, Kräuter, Dip.',
        descriptionEn: 'Grilled pork, rice noodles, herbs, dipping sauce.',
        descriptionVi: 'Thịt lợn nướng, bún, rau sống, nước chấm.',
        ingredientsDe: 'Schweinefleisch, Reisnudeln, Fischsauce, Kräuter, Karotte',
        ingredientsEn: 'Pork, rice noodles, fish sauce, herbs, carrot',
        ingredientsVi: 'Thịt lợn, bún, nước mắm, rau thơm, cà rốt',
        sourceNote: NOTE,
        variants: portion(1620),
      },
      {
        slug: 'gebratener-reis',
        nameDe: 'Gebratener Reis',
        nameEn: 'Fried rice',
        nameVi: 'Cơm chiên',
        descriptionDe: 'Im Wok, mit Ei und Frühlingszwiebeln.',
        descriptionEn: 'From the wok, with egg and spring onions.',
        descriptionVi: 'Chiên chảo lớn, kèm trứng và hành lá.',
        ingredientsDe: 'Reis, Ei, Frühlingszwiebeln, Sojasauce',
        ingredientsEn: 'Rice, egg, spring onions, soy sauce',
        ingredientsVi: 'Cơm, trứng, hành lá, nước tương',
        vegetarian: true,
        sourceNote: NOTE,
        variants: portion(1180),
      },
      {
        slug: 'curry-tofu',
        nameDe: 'Curry mit Tofu',
        nameEn: 'Curry with tofu',
        nameVi: 'Cà ri đậu hũ',
        descriptionDe: 'Kokosmilch, Zitronengras, Süßkartoffel.',
        descriptionEn: 'Coconut milk, lemongrass, sweet potato.',
        descriptionVi: 'Nước cốt dừa, sả, khoai lang.',
        ingredientsDe: 'Tofu, Kokosmilch, Zitronengras, Süßkartoffel, Chili',
        ingredientsEn: 'Tofu, coconut milk, lemongrass, sweet potato, chilli',
        ingredientsVi: 'Đậu hũ, nước cốt dừa, sả, khoai lang, ớt',
        vegetarian: true,
        vegan: true,
        spice: 2,
        sourceNote: NOTE,
        variants: portion(1420),
      },
      {
        slug: 'pad-thai',
        nameDe: 'Pad Thai',
        nameEn: 'Pad Thai',
        nameVi: 'Pad Thai',
        descriptionDe: 'Gebratene Reisnudeln mit Sojasprossen, Erdnüssen und einer Limettenspalte.',
        descriptionEn: 'Fried rice noodles with bean sprouts, peanuts and a wedge of lime.',
        descriptionVi: 'Miến gạo xào cùng giá đỗ, đậu phộng và một miếng chanh.',
        photoId: 'pad-thai',
        sourceNote: NOTE,
        variants: portion(1540),
      },
      {
        slug: 'garnelen-curry',
        nameDe: 'Garnelen-Curry',
        nameEn: 'Prawn curry',
        nameVi: 'Cà ri tôm',
        descriptionDe: 'Garnelen in einer gelben Currysauce, mit Chili und Kräutern in der Schale angerichtet.',
        descriptionEn: 'Prawns in a yellow curry sauce, arranged in the bowl with chilli and herbs.',
        descriptionVi: 'Tôm nấu cà ri vàng, dọn trong tô cùng ớt và rau thơm.',
        photoId: 'garnelen-curry',
        spice: 2,
        sourceNote: NOTE,
        variants: portion(1980),
      },
      {
        slug: 'garnelen-reisnudeln',
        nameDe: 'Garnelen mit Reisnudeln',
        nameEn: 'Prawns with rice noodles',
        nameVi: 'Tôm với bún gạo',
        descriptionDe: 'Gebratene Nudeln mit Garnelen, Zuckerschoten und Sojasprossen.',
        descriptionEn: 'Fried noodles with prawns, mangetout and bean sprouts.',
        descriptionVi: 'Mì xào với tôm, đậu Hà Lan và giá đỗ.',
        photoId: 'garnelen-nudeln',
        sourceNote: NOTE,
        variants: portion(1880),
      },
      {
        slug: 'lachsfilet',
        nameDe: 'Lachsfilet',
        nameEn: 'Salmon fillet',
        nameVi: 'Phi lê cá hồi',
        descriptionDe: 'Lachsfilet mit knuspriger Haut, dazu grüner Spargel, Tomaten und eine dunkle Sauce.',
        descriptionEn: 'Salmon fillet with crisp skin, with green asparagus, tomatoes and a dark sauce.',
        descriptionVi: 'Phi lê cá hồi da giòn, ăn kèm măng tây xanh, cà chua và sốt màu sẫm.',
        photoId: 'lachsfilet',
        sourceNote: NOTE,
        variants: portion(1980),
      },
      {
        slug: 'riesengarnelen',
        nameDe: 'Riesengarnelen',
        nameEn: 'King prawns',
        nameVi: 'Tôm sú lớn',
        descriptionDe: 'Große Garnelen, längs aufgeschnitten und gegrillt, auf Glasnudeln, dazu Saucentupfen.',
        descriptionEn: 'Large prawns, split lengthwise and grilled, on glass noodles with dots of sauce.',
        descriptionVi: 'Tôm lớn xẻ dọc đem nướng, đặt trên miến, kèm vài chấm sốt.',
        photoId: 'riesengarnelen',
        sourceNote: NOTE,
        variants: portion(2180),
      },
      {
        slug: 'buddha-bowl',
        nameDe: 'Buddha Bowl',
        nameEn: 'Buddha bowl',
        nameVi: 'Buddha Bowl',
        descriptionDe:
          'Schale mit Reis, Edamame, Paprika, Mango, Avocado, Blattsalat, Teigtaschen und gegrillten Streifen in dunkler Glasur.',
        descriptionEn:
          'A bowl of rice, edamame, pepper, mango, avocado, leaf salad, dumplings and grilled strips in a dark glaze.',
        descriptionVi:
          'Tô gồm cơm, đậu edamame, ớt chuông, xoài, bơ, xà lách, há cảo và vài lát nướng phủ sốt sẫm màu.',
        photoId: 'buddha-bowl',
        sourceNote: NOTE,
        variants: portion(1480),
      },
    ],
  },

  {
    slug: 'desserts',
    nameDe: 'Desserts',
    nameEn: 'Desserts',
    nameVi: 'Tráng miệng',
    dishes: [
      {
        slug: 'dessert-des-hauses',
        nameDe: 'Dessert des Hauses',
        nameEn: 'Dessert of the house',
        nameVi: 'Tráng miệng của quán',
        descriptionDe: 'Wechselt mit der Saison. Fragen Sie unser Team, was heute im Haus ist.',
        descriptionEn: 'Changes with the season. Ask our team what is in the house today.',
        descriptionVi: 'Thay đổi theo mùa. Hỏi nhân viên xem hôm nay có gì.',
        plateId: 'dessert',
        vegetarian: true,
        featured: true,
        sourceNote: NOTE,
        variants: portion(890),
      },
      {
        slug: 'mango-sticky-rice',
        nameDe: 'Mango Sticky Rice',
        nameEn: 'Mango sticky rice',
        nameVi: 'Xôi xoài',
        descriptionDe: 'Klebreis in Kokosmilch, mit frischer Mango.',
        descriptionEn: 'Sticky rice in coconut milk, with fresh mango.',
        descriptionVi: 'Xôi nếp nấu nước cốt dừa, ăn cùng xoài tươi.',
        vegetarian: true,
        vegan: true,
        sourceNote: NOTE,
        variants: portion(780),
      },
    ],
  },

  {
    slug: 'bar',
    nameDe: 'Bar',
    nameEn: 'Bar',
    nameVi: 'Quầy bar',
    noteDe: 'Cocktails, Wein und Champagner — nur im Restaurant, nicht zum Mitnehmen.',
    noteEn: 'Cocktails, wine and champagne — in the restaurant only, not for collection.',
    noteVi: 'Cocktail, rượu vang và champagne — chỉ tại quán, không bán mang về.',
    dishes: [
      {
        slug: 'signature-cocktail',
        nameDe: 'Signature Cocktail',
        nameEn: 'Signature cocktail',
        nameVi: 'Cocktail đặc trưng',
        descriptionDe: 'Von der Bar, wechselnd. Auf Wunsch auch alkoholfrei.',
        descriptionEn: 'From the bar, changing. Without alcohol on request.',
        descriptionVi: 'Do quầy bar pha, đổi theo mùa. Có bản không cồn nếu khách muốn.',
        photoId: 'signature-cocktail',
        plateId: 'drink',
        featured: true,
        sourceNote: NOTE,
        variants: [{ labelDe: 'Glas', labelEn: 'Glass', labelVi: 'Ly', priceCents: 1250, isDefault: true, orderable: false }],
      },
      {
        slug: 'champagner',
        nameDe: 'Champagner',
        nameEn: 'Champagne',
        nameVi: 'Champagne',
        descriptionDe: 'Für den Anlass. Die Flaschenauswahl bringen wir an den Tisch.',
        descriptionEn: 'For the occasion. We bring the bottle list to your table.',
        descriptionVi: 'Cho dịp đặc biệt. Danh sách chai được mang tới tận bàn.',
        plateId: 'champagne',
        sourceNote: NOTE,
        variants: [{ labelDe: 'Glas', labelEn: 'Glass', labelVi: 'Ly', priceCents: 1400, isDefault: true, orderable: false }],
      },
      {
        slug: 'coupe-cocktail',
        nameDe: 'Coupe-Cocktail',
        nameEn: 'Coupe cocktail',
        nameVi: 'Cocktail ly coupe',
        descriptionDe: 'Gelber Cocktail mit Schaumkrone in der Coupe-Schale, mit einer Blüte garniert.',
        descriptionEn: 'A yellow cocktail with a crown of foam in a coupe glass, garnished with a flower.',
        descriptionVi: 'Cocktail màu vàng phủ lớp bọt, rót trong ly coupe, trang trí một bông hoa.',
        photoId: 'coupe-cocktail',
        sourceNote: NOTE,
        variants: [{ labelDe: 'Glas', labelEn: 'Glass', labelVi: 'Ly', priceCents: 1290, isDefault: true, orderable: false }],
      },
      {
        slug: 'cocktail-trio',
        nameDe: 'Cocktail-Trio',
        nameEn: 'Cocktail trio',
        nameVi: 'Bộ ba cocktail',
        descriptionDe:
          'Drei Cocktails auf einem Tablett: rot in der Martinischale, orange im Tumbler mit Gewürzrand, gelb in der Coupe-Schale.',
        descriptionEn:
          'Three cocktails on a tray: red in a martini glass, orange in a tumbler with a spiced rim, yellow in a coupe.',
        descriptionVi:
          'Ba ly cocktail trên khay: ly martini màu đỏ, ly thấp màu cam viền gia vị, ly coupe màu vàng.',
        photoId: 'cocktail-trio',
        sourceNote: NOTE,
        // Three glasses arrive together, so the label cannot read "Glas".
        variants: [
          { labelDe: 'Drei Gläser', labelEn: 'Three glasses', labelVi: 'Ba ly', priceCents: 3600, isDefault: true, orderable: false },
        ],
      },
    ],
  },
];

/**
 * A placeholder floor plan.
 *
 * The real one has not been shared. These twelve tables exist so availability
 * is computed against something concrete instead of being invented per
 * request; every row is marked unconfirmed and the admin replaces them.
 */
export const TABLES = [
  { code: 'T1', seatsMin: 1, seatsMax: 2 },
  { code: 'T2', seatsMin: 1, seatsMax: 2 },
  { code: 'T3', seatsMin: 1, seatsMax: 2 },
  { code: 'T4', seatsMin: 2, seatsMax: 4 },
  { code: 'T5', seatsMin: 2, seatsMax: 4 },
  { code: 'T6', seatsMin: 2, seatsMax: 4 },
  { code: 'T7', seatsMin: 2, seatsMax: 4 },
  { code: 'T8', seatsMin: 4, seatsMax: 6 },
  { code: 'T9', seatsMin: 4, seatsMax: 6 },
  { code: 'T10', seatsMin: 5, seatsMax: 8 },
  { code: 'B1', seatsMin: 1, seatsMax: 2 },
  { code: 'B2', seatsMin: 1, seatsMax: 2 },
];

/**
 * Two sample offers so the promotions section has something to show. Both are
 * marked as demo content and can be deleted from the upload screen.
 */
export const PROMOTIONS = [
  {
    slug: 'lunch-im-1987',
    titleDe: 'Mittags im 1987',
    titleEn: 'Lunch at 1987',
    titleVi: 'Bữa trưa tại 1987',
    bodyDe: 'Von Montag bis Freitag stellt die Küche mittags eine kleine Karte zusammen. Demo-Inhalt.',
    bodyEn: 'Monday to Friday the kitchen puts together a short lunch card. Demo content.',
    bodyVi: 'Thứ Hai đến thứ Sáu bếp làm một thực đơn trưa rút gọn. Nội dung demo.',
    imagePath: '/img/scene/dining-room-1280.webp',
    imageWidth: 1280,
    imageHeight: 719,
    published: true,
    sort: 0,
  },
  {
    slug: 'sushi-abend',
    titleDe: 'Sushi-Abend',
    titleEn: 'Sushi evening',
    titleVi: 'Tối sushi',
    bodyDe: 'Jeden Donnerstag am Tresen: die Sushi-Bank arbeitet vor Ihren Augen. Demo-Inhalt.',
    bodyEn: 'Every Thursday at the counter: the sushi bench works in front of you. Demo content.',
    bodyVi: 'Mỗi tối thứ Năm tại quầy: đầu bếp sushi làm ngay trước mặt khách. Nội dung demo.',
    imagePath: '/img/scene/sushi-bench-1280.webp',
    imageWidth: 1280,
    imageHeight: 719,
    published: true,
    sort: 1,
  },
];
