export const CLIENT_PAGE_SIZE = 500;

// Keep requests below PostgREST's row cap and never return a partial directory.
export async function fetchAllPages<T, E>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: E | null }>,
): Promise<{ data: T[] | null; error: E | null }> {
  const rows: T[] = [];
  for (let from = 0; ; from += CLIENT_PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + CLIENT_PAGE_SIZE - 1);
    if (error) return { data: null, error };
    const page = data ?? [];
    rows.push(...page);
    if (page.length < CLIENT_PAGE_SIZE) return { data: rows, error: null };
  }
}

const normalizeName = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-BR")
  .trim()
  .replace(/\s+/g, " ");

export function matchesClientName(name: string, search: string): boolean {
  const normalizedName = normalizeName(name);
  return normalizeName(search).split(" ").every((part) => normalizedName.includes(part));
}