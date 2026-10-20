// CareerConnect — SearchBar: keyword + location with typeahead & instant
// filtering (STEP 9, upgrades the Step 8 version).
// Responsibilities split cleanly:
//  • This component owns TEXT the user is typing (and the dropdown).
//  • The Jobs page owns the URL. We push changes up via onSearch(); when the
//    URL moves on its own (back button, chip ×) the props change and we adopt.
// How "instant" works (all scheduled from event handlers — no debounce
// effect, so no setState-in-effect churn):
//  1. every keystroke re-arms ONE 350ms timer; when it fires, the trimmed
//     text is committed to the URL, which refetches the results list;
//  2. the same timer calls GET /jobs/suggestions and feeds the typeahead
//     dropdown (titles / locations / skills / categories).
import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchSuggestions } from '../services/api';

const MIN_SUGGESTIONS = 2; // show dropdown from 2 chars (backend guards too)
const COMMIT_MS = 350;

const GROUP_META = {
  title: { label: 'Job titles', icon: 'bi-briefcase' },
  location: { label: 'Locations', icon: 'bi-geo-alt' },
  skill: { label: 'Skills', icon: 'bi-lightning-charge' },
  category: { label: 'Categories', icon: 'bi-collection' },
};

const flatten = (data) => [
  ...data.titles.map((value) => ({ group: 'title', value })),
  ...data.locations.map((value) => ({ group: 'location', value })),
  ...data.skills.map((value) => ({ group: 'skill', value })),
  ...data.categories.map((value) => ({ group: 'category', value })),
];

// Bold-mark the matched substring inside a suggestion (simple indexOf split —
// the backend matched case-insensitively, so we do the same).
const Highlight = ({ text, query }) => {
  const idx = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="cc-mark">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
};

const SearchBar = ({ initialTerm = '', initialLocation = '', onSearch }) => {
  const [term, setTerm] = useState(initialTerm);
  const [location, setLocation] = useState(initialLocation);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1); // highlighted dropdown row
  const [suggestions, setSuggestions] = useState([]);
  const termInputRef = useRef(null);
  const timerRef = useRef(null);
  const fetchSeqRef = useRef(0); // last-suggestion-wins guard

  // The URL values we last accepted (adopted or committed). Comparing them
  // with the props tells "URL changed externally" apart from "URL caught up
  // with my own commit".
  const [lastExternal, setLastExternal] = useState({
    search: initialTerm,
    location: initialLocation,
  });

  // External URL move (chip ×, browser back) → adopt it. This is React's
  // documented "adjust state while rendering" pattern: guarded and
  // idempotent, so it needs no extra effect.
  if (initialTerm !== lastExternal.search || initialLocation !== lastExternal.location) {
    setLastExternal({ search: initialTerm, location: initialLocation });
    setTerm(initialTerm);
    setLocation(initialLocation);
  }

  // Clear-on-unmount for the pending commit timer. Effect body sets no
  // state; only the cleanup touches the ref.
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const cancelPending = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const commit = (rawTerm, rawLocation) => {
    const values = { search: String(rawTerm).trim(), location: String(rawLocation).trim() };
    if (values.search === lastExternal.search && values.location === lastExternal.location) {
      return; // nothing actually changed → no URL write, no refetch
    }
    setLastExternal(values);
    setTerm(String(rawTerm));
    setLocation(String(rawLocation));
    onSearch(values);
  };

  const fetchTypeahead = (rawTerm) => {
    const q = String(rawTerm).trim();
    if (q.length < MIN_SUGGESTIONS) return;
    const seq = fetchSeqRef.current + 1;
    fetchSeqRef.current = seq;
    fetchSuggestions(q)
      .then((data) => {
        if (fetchSeqRef.current === seq) setSuggestions(flatten(data)); // drop stale replies
      })
      .catch(() => {
        // dropdown is best-effort: the results list already reflects the text
        if (fetchSeqRef.current === seq) setSuggestions([]);
      });
  };

  // The one scheduling helper: every keystroke restarts the 350ms pause.
  const scheduleCommit = (nextTerm, nextLocation) => {
    cancelPending();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      commit(nextTerm, nextLocation);
      fetchTypeahead(nextTerm);
    }, COMMIT_MS);
  };

  const handleTermChange = (e) => {
    const value = e.target.value;
    setTerm(value);
    setActive(-1);
    setOpen(value.trim().length >= MIN_SUGGESTIONS);
    scheduleCommit(value, location);
  };

  const handleLocationChange = (e) => {
    setLocation(e.target.value);
    scheduleCommit(term, e.target.value);
  };

  // Group the flat suggestion list with header rows for rendering.
  const rows = useMemo(() => {
    const out = [];
    let lastGroup = null;
    suggestions.forEach((s) => {
      if (s.group !== lastGroup) {
        out.push({ header: s.group });
        lastGroup = s.group;
      }
      out.push(s);
    });
    return out;
  }, [suggestions]);

  const showDropdown = open && term.trim().length >= MIN_SUGGESTIONS;

  const choose = (row) => {
    // A "Locations" suggestion fills the location box (keeps current keyword);
    // everything else becomes the keyword.
    cancelPending(); // my pending keystroke timer must not overwrite this choice
    if (row.group === 'location') commit(term, row.value);
    else commit(row.value, location);
    setOpen(false);
    termInputRef.current?.focus();
  };

  // Arrow keys walk only selectable rows (skip group headers), wrapping.
  const moveActive = (dir) => {
    if (!rows.length) return;
    setActive((current) => {
      let i = current;
      for (let step = 0; step < rows.length; step += 1) {
        i += dir;
        if (i < 0) i = rows.length - 1;
        if (i >= rows.length) i = 0;
        if (!rows[i].header) return i;
      }
      return current;
    });
  };

  const handleKeyDown = (e) => {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveActive(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveActive(-1);
    } else if (e.key === 'Enter' && active >= 0 && rows[active]) {
      e.preventDefault();
      choose(rows[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const hasText = term !== '' || location !== '';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        cancelPending(); // Enter = apply now, don't wait for the timer
        commit(term, location);
        setOpen(false);
      }}
      role="search"
      aria-label="Job search"
      className="position-relative"
    >
      <div className="input-group input-group-lg shadow-sm">
        <span className="input-group-text bg-white border-end-0">
          <i className="bi bi-search text-primary" aria-hidden="true"></i>
        </span>
        <input
          ref={termInputRef}
          type="search"
          className="form-control border-end-0"
          placeholder="Job title, company, skill… (results update as you type)"
          aria-label="Search keywords"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="search-typeahead"
          aria-autocomplete="list"
          autoComplete="off"
          value={term}
          onChange={handleTermChange}
          onFocus={() => {
            const focusedTerm = term.trim();
            if (focusedTerm.length >= MIN_SUGGESTIONS) {
              setOpen(true);
              if (!suggestions.length) fetchTypeahead(focusedTerm);
            }
          }}
          onBlur={(e) => {
            if (!e.currentTarget.closest('form').contains(e.relatedTarget)) setOpen(false);
          }}
          onKeyDown={handleKeyDown}
        />
        <span className="input-group-text bg-white border-end-0">
          <i className="bi bi-geo-alt text-primary" aria-hidden="true"></i>
        </span>
        <input
          type="search"
          className="form-control border-end-0"
          placeholder="Location"
          aria-label="Location"
          autoComplete="off"
          value={location}
          onChange={handleLocationChange}
        />
        <button className="btn btn-primary px-4" type="submit">
          Search
        </button>
        {hasText && (
          <button
            className="btn btn-outline-secondary"
            type="button"
            title="Clear search"
            onClick={() => {
              cancelPending();
              commit('', '');
            }}
          >
            <i className="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          id="search-typeahead"
          className="cc-typeahead-menu shadow"
          role="listbox"
          aria-label="Search suggestions"
        >
          {rows.length === 0 ? (
            <p className="cc-typeahead-empty mb-0">
              <i className="bi bi-info-circle me-1" aria-hidden="true"></i>
              No suggestions yet — press Enter to search anyway.
            </p>
          ) : (
            rows.map((row, i) =>
              row.header ? (
                <div key={`h-${row.header}`} className="cc-typeahead-group">
                  {GROUP_META[row.header].label}
                </div>
              ) : (
                <button
                  type="button"
                  key={`${row.group}-${row.value}`}
                  id={`sg-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={`cc-typeahead-item${i === active ? ' active' : ''}`}
                  // onMouseDown fires before the input's blur → reliable click
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(row);
                  }}
                  onMouseEnter={() => setActive(i)}
                >
                  <i className={`bi ${GROUP_META[row.group].icon} text-muted me-2`}></i>
                  <span className="flex-grow-1 text-start">
                    <Highlight text={row.value} query={term.trim()} />
                  </span>
                  {row.group === 'location' ? (
                    <span className="badge text-bg-light border ms-2">use as location</span>
                  ) : null}
                </button>
              )
            )
          )}
        </div>
      )}
    </form>
  );
};

export default SearchBar;
