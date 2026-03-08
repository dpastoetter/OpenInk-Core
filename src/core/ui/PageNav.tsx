
interface PageNavProps {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  label?: string;
}

export function PageNav({ current, total, onPrev, onNext, label = 'Page' }: PageNavProps) {
  return (
    <nav class="page-nav" aria-label="Pagination">
      <button type="button" class="btn btn-nav" onClick={onPrev} disabled={current <= 1} aria-label="Previous page">
        Previous
      </button>
      <span class="page-nav-info" aria-live="polite">
        {label} {current} of {total}
      </span>
      <button type="button" class="btn btn-nav" onClick={onNext} disabled={current >= total} aria-label="Next page">
        Next
      </button>
    </nav>
  );
}
