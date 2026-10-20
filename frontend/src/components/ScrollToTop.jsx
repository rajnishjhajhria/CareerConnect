// CareerConnect — scroll to top on every route change (STEP 6 polish)
// Without this, navigating from a scrolled page keeps the new page scrolled.
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
