export default function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center">
      <h2 className="font-semibold text-zinc-900">
        {title}
      </h2>

      <p className="mt-2 text-sm text-zinc-500">
        {description}
      </p>
    </div>
  );
}