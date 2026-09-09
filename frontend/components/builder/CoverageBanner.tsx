import type { Coverage, Requirement } from "../../lib/kit-types";

export default function CoverageBanner({
  coverage,
  requirements,
}: {
  coverage: Coverage;
  requirements: Requirement[];
}) {
  const uncovered = coverage.uncovered_requirement_ids
    .map((id) => requirements.find((r) => r.id === id))
    .filter((r): r is Requirement => Boolean(r));

  if (uncovered.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        Every requirement has at least one linked question.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <p className="font-medium">
        {uncovered.length} requirement{uncovered.length === 1 ? "" : "s"} still without a
        question (after {coverage.passes} gap-fill pass{coverage.passes === 1 ? "" : "es"}):
      </p>
      <ul className="mt-1 list-inside list-disc">
        {uncovered.map((requirement) => (
          <li key={requirement.id}>{requirement.text}</li>
        ))}
      </ul>
    </div>
  );
}
