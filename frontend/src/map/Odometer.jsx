import React, { useMemo } from "react";

/**
 * A high-fidelity retro mechanical rolling odometer component.
 * Splits values into individual columns and rolls digit columns vertically.
 * 
 * @param {string|number} value - The value to render.
 * @param {string} theme - Color theme: "amber" | "green" | "cyan" | "red" | "white".
 * @param {boolean} inline - Whether the counter should behave as an inline text element.
 * @param {string} className - Optional custom CSS classes.
 */
export default function Odometer({ value, theme = "white", inline = false, className = "" }) {
  const str = useMemo(() => {
    if (value === null || value === undefined) return "";
    return String(value);
  }, [value]);

  const chars = useMemo(() => Array.from(str), [str]);

  return (
    <span 
      className={`odometer-container theme-${theme} ${inline ? "odometer-inline" : ""} ${className}`}
      aria-label={str}
    >
      {chars.map((char, index) => {
        // Calculate key from the right side to ensure columns align perfectly
        // as the number grows/shrinks in magnitude (e.g. ones, tens, hundreds places)
        const positionFromRight = chars.length - 1 - index;
        const key = `char-${positionFromRight}`;

        const isDigit = char >= "0" && char <= "9";

        if (!isDigit) {
          return (
            <span key={key} className="odometer-separator" aria-hidden="true">
              {char}
            </span>
          );
        }

        const digit = parseInt(char, 10);

        return (
          <span key={key} className="odometer-digit-box" aria-hidden="true">
            <span
              className="odometer-digit-strip"
              style={{ transform: `translateY(-${digit * 10}%)` }}
            >
              <span>0</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
              <span>6</span>
              <span>7</span>
              <span>8</span>
              <span>9</span>
            </span>
          </span>
        );
      })}
    </span>
  );
}
