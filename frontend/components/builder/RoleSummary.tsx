import type { Role } from "../../lib/kit-types";

const KIND_STYLES: Record<string, string> = {
  technical: "bg-sky-100 text-sky-700",
  behavioral: "bg-rose-100 text-rose-700",
  domain: "bg-amber-100 text-amber-700",
};

export default function RoleSummary({ role }: { role: Role }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="font-semibold">Role</h2>

      <p className="mt-3 text-sm text-zinc-700">
        {role.title || <span className="text-zinc-400">No title extracted</span>}
        {role.seniority && <span className="text-zinc-400"> · {role.seniority}</span>}
      </p>

      {role.responsibilities.length > 0 && (
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-zinc-600">
          {role.responsibilities.map((responsibility, index) => (
            <li key={index}>{responsibility}</li>
          ))}
        </ul>
      )}

      <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Requirements
      </h3>

      {role.requirements.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-400">No requirements extracted.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {role.requirements.map((requirement) => (
            <li key={requirement.id} className="flex items-start gap-2 text-sm">
              <span
                className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                  KIND_STYLES[requirement.kind] || "bg-zinc-100 text-zinc-600"
                }`}
              >
                {requirement.kind}
              </span>
              <span className="text-zinc-700">
                {requirement.text}
                {requirement.priority === "must" && (
                  <span className="ml-1 text-xs text-zinc-400">(must-have)</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
