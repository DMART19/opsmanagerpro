import * as React from "react";
import { Input, InputProps } from "./input";

export interface NumericInputProps extends Omit<InputProps, "type" | "value" | "onChange"> {
  /** Current numeric value (or string for controlled string state) */
  value: number | string | null | undefined;
  /** Called on every keystroke with the raw string value */
  onValueChange?: (value: string) => void;
  /** Called on blur with the parsed number (or null if empty/invalid) */
  onNumericBlur?: (value: number | null) => void;
  /** Allow decimal values (default: true) */
  allowDecimal?: boolean;
}

/**
 * NumericInput — A number input that allows temporary empty states.
 *
 * Key behaviors:
 * - Stores raw string internally so users can backspace freely
 * - Never forces a value while typing
 * - Emits parsed number only on blur via onNumericBlur
 * - Emits raw string on every keystroke via onValueChange
 */
const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      value,
      onValueChange,
      onNumericBlur,
      onBlur,
      allowDecimal = true,
      ...props
    },
    ref
  ) => {
    const toStr = (v: number | string | null | undefined): string => {
      if (v === null || v === undefined) return "";
      return String(v);
    };

    const [internalValue, setInternalValue] = React.useState(() => toStr(value));
    const isFocused = React.useRef(false);

    // Sync from external value only when not focused (prevents overriding user typing)
    React.useEffect(() => {
      if (!isFocused.current) {
        setInternalValue(toStr(value));
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setInternalValue(raw);
      onValueChange?.(raw);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocused.current = true;
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocused.current = false;
      const raw = internalValue.trim();

      if (raw === "" || raw === "-" || raw === ".") {
        onNumericBlur?.(null);
      } else {
        const num = allowDecimal ? parseFloat(raw) : parseInt(raw, 10);
        if (!isNaN(num)) {
          onNumericBlur?.(num);
          setInternalValue(String(num));
        } else {
          onNumericBlur?.(null);
          setInternalValue("");
        }
      }

      onBlur?.(e);
    };

    return (
      <Input
        ref={ref}
        type="number"
        value={internalValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);
NumericInput.displayName = "NumericInput";

export { NumericInput };
