/**
 * Simple mailbox for passing variant changes from CardDetailScreen
 * back to BinderDetailScreen without relying on a DB roundtrip.
 */

type VariantUpdate = {
  binderId: string;
  cardId: string;
  variant: string;
};

let pending: VariantUpdate[] = [];

export function pushVariantUpdate(update: VariantUpdate) {
  pending.push(update);
}

export function popVariantUpdates(binderId: string): VariantUpdate[] {
  const matching = pending.filter(u => u.binderId === binderId);
  pending = pending.filter(u => u.binderId !== binderId);
  return matching;
}
