export default function LoadingState({
  message = "Loading...",
}: {
  message?: string;
}) {
  return (
    <div
      className="flex items-center justify-center py-12 text-sm text-zinc-500"
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}