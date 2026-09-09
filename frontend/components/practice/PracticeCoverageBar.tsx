export default function PracticeCoverageBar({
  total,
  reviewed,
}: {
  total: number;
  reviewed: number;
}) {
  const percent = total === 0 ? 0 : Math.round((reviewed / total) * 100);

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          {reviewed} / {total} cards reviewed at least once
        </span>
        <span>{percent}%</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full rounded-full bg-black transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
