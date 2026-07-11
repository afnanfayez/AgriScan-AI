import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 dark:bg-slate-950 text-stone-800 dark:text-slate-100 p-6 font-sans text-center transition-colors duration-200">
      <div className="p-3 bg-stone-100 dark:bg-slate-900 rounded-2xl mb-4 border border-stone-200 dark:border-slate-800">
        <span className="text-sm font-mono font-bold text-stone-500 dark:text-slate-400">404</span>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-stone-950 dark:text-slate-50">Resource Not Found</h1>
      <p className="mt-2 text-xs text-stone-500 dark:text-slate-400 max-w-sm leading-relaxed">
        The Farm dashboard layout, crop details, or analytics section you requested could not be resolved.
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
