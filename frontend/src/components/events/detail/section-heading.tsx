import React from 'react';

export function SectionHeading({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="font-display text-xl tracking-tighter text-[#747878]">
          {'///'}
        </span>
        <h2 className="font-display text-2xl uppercase tracking-wider text-[#1c1b1b] sm:text-3xl">
          {title}
        </h2>
      </div>
      {hint && <p className="text-xs text-[#747878]">{hint}</p>}
      {action}
    </div>
  );
}

export default SectionHeading;
