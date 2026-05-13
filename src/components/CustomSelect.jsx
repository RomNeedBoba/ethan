import React, { useState, useRef, useEffect } from "react";

/**
 * CustomSelect Component - Accessible Dropdown
 * 
 * Props:
 * - id: HTML id attribute
 * - value: Currently selected value
 * - options: Array of {value, label, disabled?}
 * - onChange: Callback when selection changes
 * 
 * Features:
 * - Click-outside to close
 * - Keyboard accessible
 * - Visual feedback for disabled items
 * - ARIA labels for screen readers
 */
const CustomSelect = ({ id, value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="custom-select" ref={dropdownRef}>
      <button
        type="button"
        id={id}
        className={`custom-select__trigger ${isOpen ? "is-open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span>{selectedOption ? selectedOption.label : "Select..."}</span>
        <svg 
          className="custom-select__icon" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="custom-select__dropdown" role="listbox">
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`custom-select__option ${opt.value === value ? "is-selected" : ""} ${opt.disabled ? "is-disabled" : ""}`}
              style={{ 
                opacity: opt.disabled ? 0.5 : 1, 
                cursor: opt.disabled ? "not-allowed" : "pointer" 
              }}
              onClick={() => {
                if (!opt.disabled) {
                  onChange(opt.value);
                  setIsOpen(false);
                }
              }}
              role="option"
              aria-selected={opt.value === value}
              aria-disabled={opt.disabled}
            >
              {opt.label}
              
              {/* Checkmark for selected item */}
              {opt.value === value && !opt.disabled && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              
              {/* Lock icon for disabled items */}
              {opt.disabled && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ marginLeft: "auto" }} aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
