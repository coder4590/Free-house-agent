import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold font-mono text-zinc-200">404</h1>
      <p className="text-zinc-500 font-mono text-sm mt-2">Page Not Found</p>
      <Link 
        href="/" 
        className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-mono text-xs transition-colors"
      >
        Return to Floor Command
      </Link>
    </div>
  );
}
