"use client";

import { FormEvent, useState } from "react";

export default function GenerateForm({
  onSubmit,
  submitting,
  errorMessage,
  isRetry,
}: {
  onSubmit: (input: { jd: string; companyUrl: string; days: number }) => void;
  submitting: boolean;
  errorMessage?: string;
  isRetry?: boolean;
}) {
  const [jd, setJd] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [days, setDays] = useState(5);
  const [validationError, setValidationError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError("");

    if (!jd.trim()) {
      setValidationError("Paste the job description first.");
      return;
    }

    if (!/^https?:\/\//i.test(companyUrl.trim())) {
      setValidationError("Company URL must start with http:// or https://");
      return;
    }

    if (!Number.isInteger(days) || days < 1 || days > 90) {
      setValidationError("Days available should be between 1 and 90.");
      return;
    }

    onSubmit({ jd: jd.trim(), companyUrl: companyUrl.trim(), days });
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="text-lg font-semibold">
        {isRetry ? "Retry generation" : "Generate this kit"}
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Paste a job description and the company&apos;s site — we&apos;ll research the
        company, extract requirements, and build the kit.
      </p>

      {(validationError || errorMessage) && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {validationError || errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="jd" className="mb-1 block text-sm font-medium">
            Job description
          </label>
          <textarea
            id="jd"
            required
            rows={8}
            value={jd}
            onChange={(event) => setJd(event.target.value)}
            placeholder="Senior Backend Engineer&#10;&#10;We are looking for..."
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="companyUrl" className="mb-1 block text-sm font-medium">
              Company URL
            </label>
            <input
              id="companyUrl"
              type="url"
              required
              value={companyUrl}
              onChange={(event) => setCompanyUrl(event.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black"
            />
          </div>

          <div>
            <label htmlFor="days" className="mb-1 block text-sm font-medium">
              Days to prepare
            </label>
            <input
              id="days"
              type="number"
              min={1}
              max={90}
              required
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-black px-4 py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {submitting ? "Generating..." : isRetry ? "Retry" : "Generate kit"}
        </button>
      </form>
    </div>
  );
}
