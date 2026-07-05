// A small curated set of common English + business/banking words.
// Used only to decide, at a line-wrap join point, whether the previous
// fragment and the next fragment are two halves of ONE word (no space needed)
// or two separate, already-complete words (space needed).
//
// This is intentionally not exhaustive — proper nouns, merchant names, and
// person names won't be in here, so those will default to keeping a space.
// It's a best-effort heuristic, not a perfect reconstruction: there's no way
// to know the original spacing with 100% certainty from a wrapped screenshot.
export const COMMON_WORDS = new Set([
  // generic business / entity words
  'SERVICES','SERVICE','PAYMENTS','PAYMENT','LIMITED','PRIVATE','PUBLIC',
  'COMPANY','COMPANIES','CORPORATION','CORP','ENTERPRISE','ENTERPRISES',
  'INDUSTRIES','INDUSTRY','SOLUTIONS','SOLUTION','TECHNOLOGIES','TECHNOLOGY',
  'TRADERS','TRADING','TRADE','EXPORTS','EXPORT','IMPORTS','IMPORT',
  'RETAIL','WHOLESALE','DISTRIBUTORS','DISTRIBUTOR','MANUFACTURING',
  'CONSTRUCTION','INFRASTRUCTURE','COMMUNICATIONS','COMMUNICATION',
  'TELECOM','LOGISTICS','CONSULTANCY','CONSULTANTS','CONSULTANT',
  'MANAGEMENT','DEVELOPMENT','DEVELOPERS','DEVELOPER','INTERNATIONAL',
  'NATIONAL','GENERAL','SPECIAL','SECURITY','SECURITIES','INVESTMENTS',
  'INVESTMENT','CAPITAL','VENTURES','VENTURE','HOLDINGS','HOLDING',
  'GROUP','ASSOCIATES','ASSOCIATE','PARTNERS','PARTNER','BROTHERS',
  'STORES','STORE','SUPERMARKET','HOSPITAL','CLINIC','SCHOOL','COLLEGE',
  'UNIVERSITY','FOUNDATION','TRUST','SOCIETY','WELFARE','CHARITABLE',
  'BANKING','FINANCIAL','FINANCE','INSURANCE','PHARMACEUTICALS',
  'PHARMACY','ELECTRONICS','HARDWARE','SOFTWARE','APPLIANCES',
  'AUTOMOBILE','AUTOMOBILES','MOTORS','TEXTILES','GARMENTS','APPAREL',
  'FOODS','BEVERAGES','RESTAURANT','RESTAURANTS','HOTELS','HOTEL',
  'REALTY','PROPERTIES','PROPERTY','BUILDERS','BUILDER','ENGINEERING',
  'ELECTRICALS','ELECTRICAL','CHEMICALS','CHEMICAL','AGENCIES','AGENCY',
  'MARKETING','ADVERTISING','MEDIA','ENTERTAINMENT','TRANSPORT',
  'TRANSPORTS','CARGO','SHIPPING','AVIATION','AIRLINES','TOURS',
  'TRAVELS','TRAVEL','ONLINE','DIGITAL','SYSTEMS','SYSTEM','NETWORKS',
  'NETWORK','GLOBAL','WORLDWIDE','OVERSEAS','EXCHANGE','MARKETS','MARKET',
  // common connective / general words
  'AND','THE','FOR','WITH','FROM','THIS','THAT','THESE','THOSE',
  'ACCOUNT','ACCOUNTS','TRANSFER','TRANSFERS','DEPOSIT','WITHDRAWAL',
  'PAYMENT','CHARGES','CHARGE','REFUND','REVERSAL','SALARY','BONUS',
]);

/**
 * Decides how to join two adjacent text fragments that came from consecutive
 * wrapped lines. Returns the joined string.
 *
 * Only the last token of `prevText` and the first token of `nextText` are
 * checked — if gluing them together (no space) forms a recognized word,
 * we merge them; otherwise we keep them as separate words.
 */
export function smartJoin(prevText, nextText) {
  if (!prevText) return nextText;
  if (!nextText) return prevText;

  const prevTokens = prevText.split(' ');
  const nextTokens = nextText.split(' ');
  const tail = prevTokens[prevTokens.length - 1];
  const head = nextTokens[0];

  const candidate = (tail + head).toUpperCase();

  if (tail && head && COMMON_WORDS.has(candidate)) {
    prevTokens[prevTokens.length - 1] = tail + head;
    nextTokens.shift();
    return [...prevTokens, ...nextTokens].filter(Boolean).join(' ');
  }

  return `${prevText} ${nextText}`.replace(/\s+/g, ' ').trim();
}