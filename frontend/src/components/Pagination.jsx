// CareerConnect — Pagination (STEP 8, spec §20)
// Pure UI: given { page, pages } it calls onChange(newPage). The Jobs page
// decides what a page change means (write ?page= to the URL). Shows a window
// of at most 5 numbered buttons around the current page.
const Pagination = ({ page, pages, onChange }) => {
  if (pages <= 1) return null;

  // window: try to show up to 5 numbers centered on `page`
  let start = Math.max(1, page - 2);
  const end = Math.min(pages, start + 4);
  start = Math.max(1, end - 4);
  const numbers = [];
  for (let i = start; i <= end; i += 1) numbers.push(i);

  const arrow = (target, icon, disabled, label) => (
    <button
      type="button"
      className="btn btn-sm btn-outline-primary"
      disabled={disabled}
      aria-label={label}
      onClick={() => onChange(target)}
    >
      <i className={`bi bi-chevron-${icon}`}></i>
    </button>
  );

  return (
    <nav aria-label="Job list pages" className="d-flex justify-content-center align-items-center gap-2 my-4">
      {arrow(page - 1, 'left', page <= 1, 'Previous page')}
      {start > 1 && <span className="text-muted small">…</span>}
      {numbers.map((n) => (
        <button
          key={n}
          type="button"
          className={`btn btn-sm ${n === page ? 'btn-primary' : 'btn-outline-primary'}`}
          aria-current={n === page ? 'page' : undefined}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
      {end < pages && <span className="text-muted small">…</span>}
      {arrow(page + 1, 'right', page >= pages, 'Next page')}
    </nav>
  );
};

export default Pagination;
