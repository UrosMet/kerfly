import type { ModuleType } from '../../core/types';

/** Small line icon of a cabinet type, for the add buttons. */
export default function ModuleIcon({ type }: { type: ModuleType }) {
  return (
    <svg className="module-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      {type === 'base' && (
        <>
          <rect x="4" y="9" width="16" height="11" rx="1.5" />
          <path d="M15 12.5v3" />
        </>
      )}
      {type === 'drawer' && (
        <>
          <rect x="4" y="5" width="16" height="15" rx="1.5" />
          <path d="M4 10h16M4 15h16M10.5 7.5h3M10.5 12.5h3M10.5 17.5h3" />
        </>
      )}
      {type === 'sink' && (
        <>
          <rect x="4" y="10" width="16" height="10" rx="1.5" />
          <path d="M12 10v10M7 7c0-1.5 1.5-2 3-2s3 .5 3 2M10 5V3" />
        </>
      )}
      {type === 'wall' && (
        <>
          <rect x="4" y="4" width="16" height="9" rx="1.5" />
          <path d="M15 7.5v2.5M8 17h8" />
        </>
      )}
      {type === 'tall' && (
        <>
          <rect x="7" y="2.5" width="10" height="19" rx="1.5" />
          <path d="M7 12.5h10M14.5 6v3M14.5 15v3" />
        </>
      )}
    </svg>
  );
}
