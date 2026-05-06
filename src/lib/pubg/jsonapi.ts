export interface JsonApiResource<TAttributes = Record<string, unknown>> {
  type: string;
  id: string;
  attributes?: TAttributes;
  relationships?: Record<
    string,
    {
      data: { type: string; id: string } | { type: string; id: string }[] | null;
    }
  >;
  links?: Record<string, string>;
}

export interface JsonApiDoc<TData = JsonApiResource | JsonApiResource[]> {
  data: TData;
  included?: JsonApiResource[];
  links?: Record<string, string>;
  meta?: Record<string, unknown>;
}

export function findIncluded<T = Record<string, unknown>>(
  included: JsonApiResource[] | undefined,
  type: string,
  id: string,
): JsonApiResource<T> | undefined {
  if (!included) return undefined;
  return included.find(
    (r) => r.type === type && r.id === id,
  ) as JsonApiResource<T> | undefined;
}

export function listIncluded<T = Record<string, unknown>>(
  included: JsonApiResource[] | undefined,
  type: string,
): JsonApiResource<T>[] {
  if (!included) return [];
  return included.filter((r) => r.type === type) as JsonApiResource<T>[];
}

export function relMany(
  resource: JsonApiResource | undefined,
  relName: string,
): { type: string; id: string }[] {
  const rel = resource?.relationships?.[relName]?.data;
  if (!rel) return [];
  return Array.isArray(rel) ? rel : [rel];
}

export function relOne(
  resource: JsonApiResource | undefined,
  relName: string,
): { type: string; id: string } | null {
  const rel = resource?.relationships?.[relName]?.data;
  if (!rel || Array.isArray(rel)) return null;
  return rel;
}
