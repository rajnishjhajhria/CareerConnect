// CareerConnect — reusable modal dialog (STEP 5)
// React-controlled (via the `show` prop), styled with Bootstrap classes.
// <Modal show={open} onClose={() => setOpen(false)} title="…" footer={…}>…</Modal>
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const Modal = ({ show, onClose, title, children, footer, size = '' }) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Escape-to-close + lock background scroll while open
  useEffect(() => {
    if (!show) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [show]);

  if (!show) return null;

  return createPortal((
    <>
      <div className="cc-modal-backdrop" onClick={() => onCloseRef.current()}></div>
      <div className="cc-modal" tabIndex="-1" role="dialog" aria-modal="true" onClick={() => onCloseRef.current()}>
        <div
          className={`cc-modal-dialog ${size}`}
          role="document"
          onClick={(e) => e.stopPropagation()} // clicks inside must not close it
        >
          <div className="modal-content cc-modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
            </div>
            <div className="modal-body cc-modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
    </>
  ), document.body);
};

export default Modal;
