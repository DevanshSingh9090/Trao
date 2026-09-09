import type { ItemOrigin } from "../../lib/kit-types";

const STYLES: Record<ItemOrigin, string> = {
  generated: "bg-zinc-100 text-zinc-500",
  edited: "bg-blue-100 text-blue-700",
  pinned: "bg-purple-100 text-purple-700",
};

export default function OriginBadge({ origin }: { origin: ItemOrigin }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STYLES[origin]}`}>
      {origin}
    </span>
  );
}
