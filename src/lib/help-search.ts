/**
 * Intelligent Help Search — semantic-style matching for natural language queries.
 *
 * Uses synonym expansion, n-gram matching, and TF-IDF-like scoring
 * to match queries like "How do I move items?" to the best articles.
 */

import { helpArticles, commonQuestions, type HelpArticle } from "./help-content";

// ─── Synonym Map ───
// Maps common natural language terms to keywords found in help content
const SYNONYMS: Record<string, string[]> = {
  move: ["transfer", "relocate", "drag", "reassign", "change container", "move item"],
  add: ["create", "new", "insert", "adding"],
  delete: ["remove", "trash", "discard", "erase"],
  edit: ["update", "change", "modify", "editing"],
  team: ["member", "employee", "staff", "people", "person"],
  asset: ["item", "equipment", "inventory", "resource"],
  container: ["box", "bin", "group", "organize", "storage"],
  search: ["find", "look", "filter", "locate"],
  export: ["download", "csv", "pdf", "report", "spreadsheet"],
  import: ["upload", "bulk", "spreadsheet", "excel"],
  checkout: ["check out", "assign", "lend", "borrow", "check-out", "checking"],
  checkin: ["check in", "return", "bring back", "check-in"],
  credential: ["certification", "license", "training", "compliance", "certificate"],
  expire: ["expiration", "expiry", "due", "renew", "renewal"],
  alert: ["notification", "warning", "remind", "reminder"],
  pallet: ["palletize", "stacking", "load", "layout"],
  calendar: ["schedule", "task", "event", "deadline", "reminder"],
  dashboard: ["home", "overview", "summary", "metrics"],
  settings: ["configure", "preferences", "setup", "customize", "config"],
  barcode: ["scan", "qr", "code"],
  status: ["condition", "state", "availability"],
  warehouse: ["location", "section", "storage area", "zone"],
  invite: ["share", "collaborate", "workspace member", "access"],
  sort: ["order", "arrange", "rank", "organize"],
};

// ─── Stop words to ignore ───
const STOP_WORDS = new Set([
  "how", "do", "i", "the", "a", "an", "to", "in", "on", "is", "it",
  "can", "what", "where", "when", "why", "my", "this", "that", "of",
  "for", "with", "does", "should", "would", "could", "be", "am", "are",
  "was", "were", "will", "and", "or", "but", "not", "so", "if", "at",
  "by", "from", "up", "about", "into", "over", "after", "me", "we",
]);

// ─── Tokenize and expand query ───
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

function expandQuery(tokens: string[]): string[] {
  const expanded = new Set(tokens);

  for (const token of tokens) {
    // Direct synonym lookup
    if (SYNONYMS[token]) {
      SYNONYMS[token].forEach(s => expanded.add(s));
    }
    // Reverse synonym lookup
    for (const [key, syns] of Object.entries(SYNONYMS)) {
      if (syns.some(s => s.includes(token) || token.includes(s))) {
        expanded.add(key);
        syns.forEach(s => expanded.add(s));
      }
    }
  }

  return [...expanded];
}

// ─── Score an article against expanded query terms ───
function scoreArticle(article: HelpArticle, queryTerms: string[]): number {
  let score = 0;
  const titleLower = article.title.toLowerCase();
  const summaryLower = article.summary.toLowerCase();
  const stepsText = article.steps.join(" ").toLowerCase();
  const keywordsText = (article.keywords || []).join(" ").toLowerCase();
  const allText = `${titleLower} ${summaryLower} ${stepsText} ${keywordsText}`;

  for (const term of queryTerms) {
    // Title match (highest weight)
    if (titleLower.includes(term)) score += 10;
    // Summary match
    if (summaryLower.includes(term)) score += 6;
    // Keywords match
    if (keywordsText.includes(term)) score += 5;
    // Steps match
    if (stepsText.includes(term)) score += 2;
  }

  // Bonus: consecutive term matches in title (phrase match)
  const rawQuery = queryTerms.join(" ");
  if (titleLower.includes(rawQuery)) score += 15;
  if (summaryLower.includes(rawQuery)) score += 8;

  // Penalize very long articles slightly (prefer focused content)
  if (article.steps.length > 8) score -= 1;

  return score;
}

function scoreQuestion(
  question: { question: string; answer: string },
  queryTerms: string[]
): number {
  let score = 0;
  const qLower = question.question.toLowerCase();
  const aLower = question.answer.toLowerCase();

  for (const term of queryTerms) {
    if (qLower.includes(term)) score += 8;
    if (aLower.includes(term)) score += 3;
  }

  const rawQuery = queryTerms.join(" ");
  if (qLower.includes(rawQuery)) score += 12;

  return score;
}

// ─── Public API ───

export interface SmartSearchResult {
  articles: (HelpArticle & { score: number })[];
  questions: (typeof commonQuestions[number] & { score: number })[];
  bestMatch: HelpArticle | null;
  /** Short explanation of why the best match was chosen */
  matchReason: string | null;
}

export function smartHelpSearch(query: string): SmartSearchResult {
  const trimmed = query.trim();
  if (!trimmed) {
    return { articles: [], questions: [], bestMatch: null, matchReason: null };
  }

  const tokens = tokenize(trimmed);
  if (tokens.length === 0) {
    return { articles: [], questions: [], bestMatch: null, matchReason: null };
  }

  const expandedTerms = expandQuery(tokens);

  // Score all articles
  const scoredArticles = helpArticles
    .map(a => ({ ...a, score: scoreArticle(a, expandedTerms) }))
    .filter(a => a.score > 0)
    .sort((a, b) => b.score - a.score);

  // Score all questions
  const scoredQuestions = commonQuestions
    .map(q => ({ ...q, score: scoreQuestion(q, expandedTerms) }))
    .filter(q => q.score > 0)
    .sort((a, b) => b.score - a.score);

  // Best match
  const bestMatch = scoredArticles[0] || null;
  let matchReason: string | null = null;

  if (bestMatch) {
    const topTerms = expandedTerms
      .filter(t => bestMatch.title.toLowerCase().includes(t) || bestMatch.summary.toLowerCase().includes(t))
      .slice(0, 3);
    if (topTerms.length > 0) {
      matchReason = `Matched on: ${topTerms.join(", ")}`;
    } else {
      matchReason = "Best match based on content similarity";
    }
  }

  return {
    articles: scoredArticles.slice(0, 8),
    questions: scoredQuestions.slice(0, 5),
    bestMatch,
    matchReason,
  };
}
