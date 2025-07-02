import { useState, useRef, useEffect } from "react";
import { Pencil } from "lucide-react";
import clsx from "clsx";

/**
 * EditableText
 * Props:
 * - value: string (the text to display and edit)
 * - onSave: function(newValue) (called when editing is finished)
 * - className: string (optional, for the outer div)
 * - inputClassName: string (optional, for the input)
 * - placeholder: string (optional)
 * - type: string (optional, input type, defaults to 'text')
 */
export default function EditableText({
  value,
  onSave,
  className = "",
  inputClassName = "",
  placeholder = "",
  type = "text",
  formatter = (value) => value,
  device = "desktop",
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  // When value changes from outside, update inputValue
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (inputValue !== value) {
      if (type === "number" && isNaN(inputValue)) {
        return;
      }

      onSave(inputValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setInputValue(value);
    setIsEditing(false);
  };

  // Border logic: show on hover, focus, or editing
  const borderClass = isEditing
    ? "border border-blue-400 bg-white dark:bg-gray-900"
    : focused
    ? "border border-gray-300 dark:border-gray-600"
    : "hover:border md:hover:-my-1 hover:border-gray-300 dark:hover:border-gray-600";

  return (
    <div
      className={`flex-1 justify-end truncate rounded px-1 cursor-pointer ${borderClass} ${className}`}
      tabIndex={0}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyDown={(e) => {
        if (!isEditing && (e.key === "Enter" || e.key === " ")) {
          setIsEditing(true);
        }
      }}
      onClick={() => {
        setIsEditing(true);
      }}
      style={{ minHeight: "1.5em" }}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          className={`w-full bg-transparent outline-none ${inputClassName}`}
          value={inputValue}
          placeholder={placeholder}
          type={type}
          onChange={(e) => {
            if (type === "number") {
              setInputValue(e.target.valueAsNumber);
            } else {
              setInputValue(e.target.value);
            }
          }}
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
        <div
          className={clsx(
            "flex items-center gap-1 group py-1",
            device === "mobile" && "justify-start",
            device === "desktop" && "justify-between"
          )}
        >
          <span className="">{formatter(value) || placeholder}</span>
          <Pencil
            size={16}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>
      )}
    </div>
  );
}
