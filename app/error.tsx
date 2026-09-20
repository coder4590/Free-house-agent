'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <h2 className="text-xl font-bold font-mono text-red-400">Application Error</h2>
      <p className="text-zinc-500 font-mono text-xs mt-2">{error.message || 'An unexpected error occurred.'}</p>
      <button
        onClick={() => reset()}
        className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded font-mono text-xs transition-colors cursor-pointer"
      >
        Try Again
      </button>
    </div>
  );
}
