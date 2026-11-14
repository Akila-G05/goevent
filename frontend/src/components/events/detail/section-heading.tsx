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
    <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
      <h2 className="flex items-center gap-2 font-display text-2xl uppercase tracking-wide text-[#1c1b1b] sm:text-[28px]">
        <span aria-hidden="true" className="text-[#c4c7c7]">
          ///
        </span>
        {title}
      </h2>
      {hint && <p className="text-[11px] text-[#747878]">{hint}</p>}
      {action}
    </div>
  );
}

export default SectionHeading;
