// Keeps the conversation search highlight aligned with the database search: the stored
// message text is folded (lowercase, accents removed) by public.fold_search_text, so the
// same folding has to be applied to the term before marking matches in the transcript.
const FOLD_PAIRS: [string, string][] = [["á", "a"], ["à", "a"], ["â", "a"], ["ã", "a"], ["ä", "a"], ["é", "e"], ["è", "e"], ["ê", "e"], ["ë", "e"],
  ["í", "i"], ["ì", "i"], ["î", "i"], ["ï", "i"], ["ó", "o"], ["ò", "o"], ["ô", "o"], ["õ", "o"], ["ö", "o"],
  ["ú", "u"], ["ù", "u"], ["û", "u"], ["ü", "u"], ["ç", "c"], ["ñ", "n"]];

export function foldSearchText(value: string): string {
  let folded = value.toLowerCase();
  for (const [from, to] of FOLD_PAIRS) folded = folded.split(from).join(to);
  return folded;
}

export type HighlightPart = { text: string; match: boolean };

// Returns the pieces of `text` in order, flagging the ones that match the searched term.
// Folding is one character per character, so the positions found in the folded text are
// the same positions in the original text.
export function highlightParts(text: string, term: string): HighlightPart[] {
  const needle = foldSearchText(term).replace(/[%_\\]/g, " ").replace(/\s+/g, " ").trim();
  if (!needle) return [{ text, match: false }];
  const haystack = foldSearchText(text);
  if (haystack.length !== text.length) return [{ text, match: false }];
  const parts: HighlightPart[] = [];
  let cursor = 0;
  let found = haystack.indexOf(needle, cursor);
  while (found !== -1) {
    if (found > cursor) parts.push({ text: text.slice(cursor, found), match: false });
    parts.push({ text: text.slice(found, found + needle.length), match: true });
    cursor = found + needle.length;
    found = haystack.indexOf(needle, cursor);
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
  return parts.length ? parts : [{ text, match: false }];
}
