/**
 * The one caveat that has to travel with every price on this site.
 *
 * The restaurant's old website and its old PDF card give different prices for
 * the same dishes, and neither has been confirmed. The figures in the database
 * are demo figures that make the cart and the receipts work; this line is shown
 * wherever they appear so nobody mistakes them for the real card.
 */
export const PRICE_NOTE = {
  de: 'Alle Preise sind Demo-Preise. Die alte Website und die alte PDF-Karte nennen unterschiedliche Preise; die gültige Karte bestätigt das Restaurant noch.',
  en: 'All prices are demo prices. The restaurant’s old website and old PDF card give different figures; the valid card is still to be confirmed.',
  vi: 'Toàn bộ giá là giá demo. Web cũ và bản PDF cũ của quán ghi giá khác nhau; menu chính thức vẫn chờ quán xác nhận.',
} as const;
