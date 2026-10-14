/**
 * Hybrid recall scoring (CORE-06): lexical BM25 + embedding cosine.
 *
 * Lexical: BM25 (k1 = 1.2, b = 0.75) over normalized tokens
 * (text-normalize.ts lexicalTokens: Arabic normalization, Iraqi→MSA
 * dictionary, stop words, light stemming), computed in-process over the
 * candidate memories (the user's rows in the open drawers only; nothing is
 * cached or indexed elsewhere, so a forgotten memory leaves no trace here).
 * Normalized to 0–1 by the query's total IDF: 1 = every query term matched
 * once in a document of average length.
 *
 * Vector: cosine between the query vector and the stored vector, only when
 * both come from the same model (never across models).
 *   semantic model (Ollama): rescaled (cos − 0.30) / (0.85 − 0.30), clamped to
 *   0–1 (M-02: unrelated pairs 0.25–0.31, cross-language pairs 0.64–0.78);
 *   hash fallback: the raw cosine (it is word overlap, not meaning).
 *
 * Weights (documented, tested by test/multilingual-recall.test.mjs):
 *   semantic query vector: score = 0.75 · vector + 0.25 · lexical²
 *     (squared: one shared common word, e.g. a name, counts little, so it
 *     does not outrank the right memory in another language; a full match
 *     still counts fully)
 *   hash fallback:         score = 0.40 · vector + 0.60 · lexical
 *     (the hash cosine counts only when some word matched: without a lexical
 *     match it is a bucket collision)
 *   no comparable vector:  score = lexical part only
 * Chosen on the CORE-06 test set (sweep of 0.6–0.8 vector weight, lexical
 * exponent 1–3, floor 0.25–0.35): best cross-language recall with the
 * negatives' best score (≈0.01) far below every positive target (≥0.13).
 * A result needs score ≥ MIN_RECALL_SCORE. Working-layer memories get a small
 * +0.05 boost (they used to be put first regardless of relevance).
 */

export const BM25_K1 = 1.2;
export const BM25_B = 0.75;
export const SEMANTIC_COSINE_FLOOR = 0.30;
export const SEMANTIC_COSINE_CEIL = 0.85;
export const HYBRID_WEIGHTS = {
  semantic: { vector: 0.75, lexical: 0.25, lexicalExponent: 2 },
  hash: { vector: 0.40, lexical: 0.60, lexicalExponent: 1 },
} as const;
export const MIN_RECALL_SCORE = 0.08;
export const WORKING_LAYER_BOOST = 0.05;

/** BM25 of each document for the query, normalized to 0–1 (see header). */
export function bm25Scores(queryTokens: readonly string[], docs: ReadonlyArray<readonly string[]>): number[] {
  const terms = [...new Set(queryTokens)];
  const n = docs.length;
  if (terms.length === 0 || n === 0) return docs.map(() => 0);
  const avgdl = docs.reduce((s, d) => s + d.length, 0) / n || 1;
  const df = new Map<string, number>();
  const tfs = docs.map((d) => {
    const tf = new Map<string, number>();
    for (const t of d) tf.set(t, (tf.get(t) || 0) + 1);
    for (const t of terms) if (tf.has(t)) df.set(t, (df.get(t) || 0) + 1);
    return tf;
  });
  const idf = new Map(terms.map((t) => {
    const k = df.get(t) || 0;
    return [t, Math.log(1 + (n - k + 0.5) / (k + 0.5))];
  }));
  const total = terms.reduce((s, t) => s + idf.get(t)!, 0) || 1;
  return tfs.map((tf, i) => {
    const dl = docs[i].length;
    let score = 0;
    for (const t of terms) {
      const f = tf.get(t) || 0;
      if (!f) continue;
      score += idf.get(t)! * (f * (BM25_K1 + 1)) / (f + BM25_K1 * (1 - BM25_B + BM25_B * dl / avgdl));
    }
    return Math.min(1, score / total);
  });
}

/** Vector part of the score (0–1) for a cosine of a semantic or hash model. */
export function vectorScore(cos: number, semantic: boolean): number {
  if (!semantic) return Math.max(0, Math.min(1, cos));
  return Math.max(0, Math.min(1, (cos - SEMANTIC_COSINE_FLOOR) / (SEMANTIC_COSINE_CEIL - SEMANTIC_COSINE_FLOOR)));
}

/** Combined score; `vector` is null when no comparable vector exists. */
export function hybridScore(vector: number | null, lexical: number, semantic: boolean): number {
  const w = semantic ? HYBRID_WEIGHTS.semantic : HYBRID_WEIGHTS.hash;
  return (vector === null ? 0 : w.vector * vector) + w.lexical * Math.pow(lexical, w.lexicalExponent);
}
