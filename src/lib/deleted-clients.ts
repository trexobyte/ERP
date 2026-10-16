// Global in-memory set of deleted client IDs to guarantee deleted clients never resurface
const globalForDeleted = globalThis as unknown as {
  deletedClientIdsSet: Set<string> | undefined;
};

export const deletedClientIds =
  globalForDeleted.deletedClientIdsSet ?? new Set<string>();

if (process.env.NODE_ENV !== 'production') {
  globalForDeleted.deletedClientIdsSet = deletedClientIds;
}

export function markClientDeleted(id: string) {
  deletedClientIds.add(id);
}

export function unmarkClientDeleted(id: string) {
  deletedClientIds.delete(id);
}

export function isClientDeleted(id: string): boolean {
  return deletedClientIds.has(id);
}
