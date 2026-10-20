// CareerConnect — shared display formatters (STEP 8)
// Kept out of component files so each file exports exactly one component
// (fast-refresh friendly) and the same helpers work on cards AND detail page.

// 1200000 → "12 LPA", 150000 → "1.5 LPA", 15000 → "15K"
export const formatSalary = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '';
  const v = Number(value);
  if (v >= 100000) {
    const lpa = v / 100000;
    return `${lpa % 1 === 0 ? lpa : lpa.toFixed(1)} LPA`;
  }
  return `${Math.round(v / 1000)}K`;
};

export const salaryRange = (min, max) => {
  const lo = formatSalary(min);
  const hi = formatSalary(max);
  if (lo && hi) return `₹${lo} – ₹${hi}`;
  if (lo) return `From ₹${lo}`;
  if (hi) return `Up to ₹${hi}`;
  return 'Not disclosed';
};

// "Apply before 25 Sep 2026"-style formatting (Indian locale, spec §44).
export const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// Whole days from now until the date (never negative) — used by the job card
// "Closing in N days" badge and the details-page deadline banner (STEP 10).
export const daysUntil = (dateStr) =>
  Math.max(0, Math.ceil((new Date(dateStr) - Date.now()) / 86400000));
