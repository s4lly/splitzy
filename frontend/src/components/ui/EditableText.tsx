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
  // const isEditing = true;
  // const setIsEditing = () => {};
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

  return (
    <div
      data-foo
      className={clsx(
        "flex-1 truncate rounded p-1 cursor-pointer w-full",
        focused && "p-[3px] border border-gray-300 dark:border-gray-600",
        isEditing && "text-base",
        !isEditing &&
          !focused &&
          "hover:p-[3px] hover:border hover:border-gray-300 dark:hover:border-gray-600",
        className
      )}
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
        <div className={clsx("")}>
          <span className="text-base">{formatter(value) || placeholder}</span>
        </div>
      )}
    </div>
  );
}
