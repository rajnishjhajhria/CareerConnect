// CareerConnect — profile completeness (STEP 12)
// Single source for BOTH the dashboard % and the profile page's checklist
// (Step 13 imports the same function — the number can't disagree with the
// list because there is exactly one definition of "done").
// Note: profile fields live top-level on the User document (spec §25).

const PROFILE_FIELDS = [
  {
    key: 'phone',
    label: 'Phone number',
    missing: 'Add a phone number',
    done: (u) => !!u?.phone,
  },
  {
    key: 'location',
    label: 'Location',
    missing: 'Add your location',
    done: (u) => !!u?.location?.trim(),
  },
  {
    key: 'professionalTitle',
    label: 'Professional title',
    missing: 'Set a headline (e.g. “React Developer”)',
    done: (u) => !!u?.professionalTitle?.trim(),
  },
  {
    key: 'about',
    label: 'About section',
    missing: 'Write a short About',
    done: (u) => (u?.about || '').trim().length >= 30,
  },
  {
    key: 'skills',
    label: 'Skills (3+)',
    missing: 'Add at least 3 skills',
    done: (u) => Array.isArray(u?.skills) && u.skills.length >= 3,
  },
  {
    key: 'education',
    label: 'Education',
    missing: 'Add your education details',
    done: (u) => !!u?.education?.degree?.trim() || !!u?.education?.university?.trim(),
  },
  {
    key: 'resume',
    label: 'Resume file',
    missing: 'Upload your resume (Profile page, bottom card)',
    done: (u) => !!u?.resume?.fileName,
  },
];

/**
 * @returns {{ pct: number, items: Array<{key,label,missing,done}> }}
 */
export const computeProfileCompletion = (user) => {
  const items = PROFILE_FIELDS.map(({ key, label, missing, done }) => ({
    key,
    label,
    missing,
    done: !!done(user),
  }));
  const filled = items.filter((i) => i.done).length;
  return {
    pct: Math.round((filled / items.length) * 100),
    items,
    missingItems: items.filter((i) => !i.done),
  };
};
