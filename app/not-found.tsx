import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 text-stone-800 p-6 font-sans text-center">
      <div className="p-3 bg-stone-100 rounded-2xl mb-4 border border-stone-200">
        <span className="text-sm font-mono font-bold text-stone-500">404</span>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-stone-950">Resource Not Found</h1>
      <p className="mt-2 text-xs text-stone-500 max-w-sm leading-relaxed">
        The nursery layout, crop details, or analytics section you requested could not be resolved.
      </p>
      <Link 
        href="/" 
        className="mt-6 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold tracking-wide shadow-sm transition-all"
      >
        Return to Command Center
      </Link>
    </div>
  );
}
