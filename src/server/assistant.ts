import 'server-only';

import Anthropic from '@anthropic-ai/sdk';
import { getCatalogue, type MenuDish } from './menu';
import { tr, type Locale } from '@/lib/i18n';
import { PRICE_NOTE } from '@/lib/price-note';

/**
 * The menu guide.
 *
 * Two rules decide the whole design of this file.
 *
 * First, it may only talk about dishes that are on the published card. The
 * model is given the catalogue and asked to answer from it; whatever it names,
 * the server then resolves back to real rows and throws away anything that does
 * not match. A confident invented dish is worse than no answer at all.
 *
 * Second, it must work without a model. If no API key is configured — or the
 * provider is down — the guide falls back to searching the same catalogue
 * locally and says plainly that it is doing so. The menu is never held hostage
 * to somebody else's uptime.
 */

export type Suggestion = {
  dishId: string;
  variantId: string;
  slug: string;
  code: string | null;
  name: string;
  variantLabel: string;
  priceCents: number;
  photoId: string | null;
  soldOut: boolean;
  orderable: boolean;
};

export type Answer = { answer: string; suggestions: Suggestion[]; grounded: 'model' | 'search' };

function toSuggestion(dish: MenuDish): Suggestion | null {
  const variant = dish.variants.find((entry) => entry.isDefault) ?? dish.variants[0];
  if (!variant) return null;
  return {
    dishId: String(dish.id),
    variantId: String(variant.id),
    slug: dish.slug,
    code: dish.code,
    name: dish.name,
    variantLabel: variant.label,
    priceCents: variant.priceCents,
    photoId: dish.plateId,
    soldOut: dish.soldOut,
    orderable: variant.orderable && !dish.soldOut,
  };
}

/* ------------------------------------------------------------ local search */

const STOPWORDS = new Set([
  'der', 'die', 'das', 'und', 'oder', 'ich', 'mir', 'mit', 'ohne', 'für', 'ein', 'eine', 'etwas', 'gern', 'gerne',
  'the', 'and', 'or', 'with', 'without', 'for', 'a', 'an', 'some', 'i', 'me', 'want', 'would', 'like',
  'tôi', 'muốn', 'và', 'hoặc', 'với', 'không', 'cho', 'một', 'gì', 'món',
]);

/** Scores every dish against the words in the question. */
function search(catalogue: MenuDish[], question: string): MenuDish[] {
  const words = question
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));

  const wantsVegan = /vegan|thuần chay/i.test(question);
  const wantsVegetarian = wantsVegan || /vegetari|chay|veggie/i.test(question);
  const wantsMild = /nicht scharf|mild|ohne schärfe|not spicy|không cay/i.test(question);

  const scored = catalogue
    .filter((dish) => !dish.soldOut)
    .filter((dish) => (wantsVegan ? dish.vegan : true))
    .filter((dish) => (wantsVegetarian ? dish.vegetarian : true))
    .filter((dish) => (wantsMild ? dish.spice === 0 : true))
    .map((dish) => {
      const haystack = [dish.name, dish.code ?? '', dish.description ?? '', dish.ingredients ?? '', dish.categoryName]
        .join(' ')
        .toLowerCase();
      const score = words.reduce((total, word) => total + (haystack.includes(word) ? 1 : 0), 0);
      return { dish, score };
    })
    .filter((entry) => entry.score > 0 || wantsVegan || wantsVegetarian || wantsMild)
    .sort((a, b) => b.score - a.score || Number(b.dish.featured) - Number(a.dish.featured));

  return scored.slice(0, 3).map((entry) => entry.dish);
}

function searchReply(locale: Locale, found: MenuDish[]): string {
  if (!found.length) {
    return tr(locale, {
      de: 'Dazu finde ich auf unserer Karte nichts Passendes. Fragen Sie gern unser Team im Restaurant — die kennen die Küche besser als ich.',
      en: 'I cannot find anything on our card that fits. Please ask our team in the restaurant — they know the kitchen better than I do.',
      vi: 'Trong menu của quán em không tìm được món nào hợp. Quý khách hỏi nhân viên tại quán nhé — họ rành bếp hơn em.',
    });
  }
  return tr(locale, {
    de: 'Das habe ich auf unserer Karte dazu gefunden:',
    en: 'This is what I found on our card:',
    vi: 'Đây là những món em tìm được trên menu:',
  });
}

/* ------------------------------------------------------------------- model */

const MODEL = 'claude-opus-5';

function systemPrompt(locale: Locale, catalogue: MenuDish[]): string {
  const language = { de: 'German', en: 'English', vi: 'Vietnamese' }[locale];

  const lines = catalogue.map((dish) =>
    [
      `slug=${dish.slug}`,
      dish.code ? `code=${dish.code}` : '',
      `name=${dish.name}`,
      `category=${dish.categoryName}`,
      dish.description ? `description=${dish.description}` : '',
      dish.ingredients ? `ingredients=${dish.ingredients}` : '',
      dish.vegan ? 'vegan' : dish.vegetarian ? 'vegetarian' : '',
      dish.spice > 0 ? `spice=${dish.spice}` : '',
      dish.soldOut ? 'SOLD OUT TODAY' : '',
    ]
      .filter(Boolean)
      .join(' | '),
  );

  return [
    'You are the menu guide for XIGON 1987, a Vietnamese and Japanese restaurant in Berlin.',
    `Answer in ${language}, warmly and briefly — two or three sentences at most.`,
    '',
    'Hard rules:',
    '- Only ever mention dishes from the list below. Never invent a dish, an ingredient or a price.',
    '- If nothing on the list fits, say so and suggest asking the team in the restaurant.',
    '- Never state allergen information. No allergen data has been confirmed for this menu; if asked, say the guest must ask the team.',
    '- Never promise that a dish is free of something. You do not know what else is in the kitchen.',
    '- Do not quote prices in your prose; the interface shows them beside your suggestions.',
    '- Never take an order or claim to have added anything to a basket. The guest decides.',
    '',
    'Return JSON only, with this exact shape:',
    '{"answer": "<your reply>", "slugs": ["<dish slug>", ...]}',
    'Include at most three slugs, each copied exactly from the list.',
    '',
    'The menu:',
    ...lines,
  ].join('\n');
}

export async function ask(locale: Locale, question: string): Promise<Answer> {
  const catalogue = await getCatalogue(locale);
  const key = process.env.ANTHROPIC_API_KEY;

  if (!key) {
    const found = search(catalogue, question);
    return {
      answer: searchReply(locale, found),
      suggestions: found.map(toSuggestion).filter((entry): entry is Suggestion => entry !== null),
      grounded: 'search',
    };
  }

  try {
    const client = new Anthropic({ apiKey: key });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      thinking: { type: 'adaptive' },
      system: systemPrompt(locale, catalogue),
      messages: [{ role: 'user', content: question.slice(0, 600) }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    const parsed = parseReply(text);
    if (!parsed) throw new Error('unparseable reply');

    // The model's slugs are treated as a request, not as truth: only rows that
    // exist in the catalogue survive.
    const suggestions = parsed.slugs
      .map((slug) => catalogue.find((dish) => dish.slug === slug))
      .filter((dish): dish is MenuDish => Boolean(dish))
      .slice(0, 3)
      .map(toSuggestion)
      .filter((entry): entry is Suggestion => entry !== null);

    return { answer: parsed.answer, suggestions, grounded: 'model' };
  } catch {
    // Falling back rather than failing: the guest still gets the menu.
    const found = search(catalogue, question);
    return {
      answer: searchReply(locale, found),
      suggestions: found.map(toSuggestion).filter((entry): entry is Suggestion => entry !== null),
      grounded: 'search',
    };
  }
}

function parseReply(text: string): { answer: string; slugs: string[] } | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;

  try {
    const data = JSON.parse(text.slice(start, end + 1)) as { answer?: unknown; slugs?: unknown };
    const answer = typeof data.answer === 'string' ? data.answer.trim() : '';
    if (!answer) return null;
    const slugs = Array.isArray(data.slugs) ? data.slugs.filter((slug): slug is string => typeof slug === 'string') : [];
    return { answer, slugs };
  } catch {
    return null;
  }
}

/** Appended to every reply, whichever route produced it. */
export function disclaimer(locale: Locale): string {
  return PRICE_NOTE[locale];
}
