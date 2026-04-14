import { HASHTAG_MAX_COUNT } from "./constants";

/**
 * ハッシュタグを正規化する
 * - 前後空白を除去
 * - 先頭の # を除去（表示時に再付与）
 * - 全角#→半角#変換後に除去
 */
export function normalizeHashtag(tag: string): string {
  return tag
    .trim()
    .replace(/^[#＃]+/, "")
    .trim();
}

/**
 * ハッシュタグ配列の重複を除去して整形する
 * - 正規化して比較
 * - 空文字は除去
 * - 最大数で切り詰め
 */
export function dedupeHashtags(
  tags: string[],
  maxCount: number = HASHTAG_MAX_COUNT
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of tags) {
    const normalized = normalizeHashtag(raw);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }

  return result.slice(0, maxCount);
}

/**
 * 本文中に含まれるハッシュタグを抽出する
 */
export function extractHashtagsFromText(text: string): string[] {
  const matches = text.match(/[#＃][\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF66-\uFF9F]+/g);
  if (!matches) return [];
  return matches.map(normalizeHashtag);
}

/**
 * 末尾ハッシュタグから本文内の重複を除去して返す
 */
export function dedupeWithBody(
  bodyText: string,
  hashtags: string[],
  maxCount: number = HASHTAG_MAX_COUNT
): string[] {
  const bodyTags = new Set(
    extractHashtagsFromText(bodyText).map((t) => t.toLowerCase())
  );
  const deduped = dedupeHashtags(hashtags, maxCount + bodyTags.size);
  return deduped
    .filter((tag) => !bodyTags.has(tag.toLowerCase()))
    .slice(0, maxCount);
}
