import { useState, useRef, useEffect } from "react";

/**
 * EditableText
 * Props:
 * - value: string (the text to display and edit)
 * - onSave: function(newValue) (called when editing is finished)
 * - className: string (optional, for the outer div)
 * - inputClassName: string (optional, for the input)
 * - placeholder: string (optional)
 */
export default function EditableText({
  value,
  onSave,
  className = "",
  inputClassName = "",
  placeholder = "",
}) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  // When value changes from outside, update inputValue
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Focus input when editing starts
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = () => {
    if (inputValue !== value) {
      onSave(inputValue);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setInputValue(value);
    setEditing(false);
  };

  // Border logic: show on hover, focus, or editing
  const borderClass = editing
    ? "border border-blue-400 bg-white dark:bg-gray-900"
    : focused
    ? "border border-gray-300 dark:border-gray-600"
    : "hover:border hover:border-gray-300 dark:hover:border-gray-600";

  return (
    <div
      className={`md:block col-span-5 truncate rounded px-1 cursor-pointer ${borderClass} ${className}`}
      tabIndex={0}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyDown={(e) => {
        if (!editing && (e.key === "Enter" || e.key === " ")) {
          setEditing(true);
        }
      }}
      onClick={() => {
        setEditing(true);
      }}
      style={{ minHeight: "1.5em" }}
    >
      {editing ? (
        <input
          ref={inputRef}
          className={`w-full bg-transparent outline-none ${inputClassName}`}
          value={inputValue}
          placeholder={placeholder}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSave();
            } else if (e.key === "Escape") {
              handleCancel();
            }
          }}
        />
      ) : (
        value || <span className="text-muted-foreground">{placeholder}</span>
      )}
    </div>
  );
}
