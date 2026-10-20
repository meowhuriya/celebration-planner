"use client";

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      className="mx-auto max-w-lg rounded-2xl border border-[#E8DCC8] bg-[#FFFDF8] p-8 text-center sm:p-10"
      role="alert"
      aria-live="assertive"
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#E8DCC8] bg-[#FBF6EE] text-lg text-[#5B1A2B]">
        ⚠
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B5848]">
        We encountered a hiccup
      </p>
      <h2 className="mt-1 font-serif text-3xl font-normal tracking-tight text-[#2B1B14]">
        Something went <span className="italic">wrong</span>
      </h2>
      <p className="mt-2 text-sm text-[#6B5848]">{message}</p>
      <div className="mt-6">
        <button
          type="button"
          onClick={onRetry}
          className="group inline-flex items-center gap-2 rounded-full bg-[#5B1A2B] px-6 py-2.5 text-sm font-semibold text-[#FBF6EE] transition-all hover:bg-[#3A0F1C] focus:outline-none focus:ring-2 focus:ring-[#5B1A2B] focus:ring-offset-2"
        >
          <span>Try again</span>
          <span
            className="transition-transform duration-300 group-hover:translate-x-1"
            aria-hidden="true"
          >
            →
          </span>
        </button>
      </div>
    </div>
  );
}
