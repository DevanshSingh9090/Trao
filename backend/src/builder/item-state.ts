export type ItemOrigin = "generated" | "edited" | "pinned";

export interface ItemStateEntry {
  origin: ItemOrigin;
  updatedAt: Date;
}

export interface KitItemState {
  questions: Record<string, ItemStateEntry>;
  flashcards: Record<string, ItemStateEntry>;
  companyBrief: ItemStateEntry | null;
  schedule: ItemStateEntry | null;
}

/**
 * Kit.itemState is stored as Schema.Types.Mixed, so it can arrive as
 * `undefined`/partial on older documents. This normalizes it in place and
 * always returns a fully-shaped object to work against.
 */
export function ensureItemState(kit: { itemState?: Partial<KitItemState> | null }): KitItemState {
  if (!kit.itemState) {
    kit.itemState = { questions: {}, flashcards: {}, companyBrief: null, schedule: null };
  }

  if (!kit.itemState.questions) kit.itemState.questions = {};
  if (!kit.itemState.flashcards) kit.itemState.flashcards = {};
  if (kit.itemState.companyBrief === undefined) kit.itemState.companyBrief = null;
  if (kit.itemState.schedule === undefined) kit.itemState.schedule = null;

  return kit.itemState as KitItemState;
}

export function setEntry(map: Record<string, ItemStateEntry>, id: string, origin: ItemOrigin): void {
  map[id] = { origin, updatedAt: new Date() };
}

export function deleteEntry(map: Record<string, ItemStateEntry>, id: string): void {
  delete map[id];
}

/**
 * Anything with no itemState entry yet is implicitly "generated" — a freshly
 * generated kit doesn't pre-populate an entry for every item, only once
 * something is edited/pinned/regenerated does an entry get written.
 */
export function getOrigin(map: Record<string, ItemStateEntry> | undefined, id: string): ItemOrigin {
  return map?.[id]?.origin ?? "generated";
}