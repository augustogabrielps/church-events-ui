function Toast({ message, type = 'success', onClose }) {
  if (!message) {
    return null
  }

  return (
    <div className={`toast toast--${type}`} role="status" aria-live="polite">
      <span>{message}</span>
      <button className="toast__close" type="button" onClick={onClose} aria-label="Close notification">
        &times;
      </button>
    </div>
  )
}

export default Toast
