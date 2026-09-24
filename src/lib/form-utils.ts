/**
 * Form Utilities & Controlled Input Best Practices
 * =================================================
 * 
 * CRITICAL: All inputs must be properly controlled to prevent:
 * - "Changing an uncontrolled input to be controlled" React warnings
 * - Form state not updating when users type
 * - Validation errors like "Field is required" for filled fields
 * 
 * RULES FOR CONTROLLED INPUTS:
 * 
 * 1. useState-based forms:
 *    - Always initialize with empty strings: useState("")
 *    - Never: useState() or useState(undefined)
 *    
 *    ✅ const [email, setEmail] = useState("");
 *    ❌ const [email, setEmail] = useState();
 * 
 * 2. react-hook-form:
 *    - Always provide complete defaultValues in useForm()
 *    - Every field must have a default value
 *    
 *    ✅ useForm({ defaultValues: { name: "", email: "", phone: "" }})
 *    ❌ useForm({ defaultValues: { name: "" }}) // missing email, phone
 * 
 * 3. Input components:
 *    - The <Input /> and <Textarea /> components automatically
 *      coerce undefined/null to "" for safety
 *    - Still prefer explicit initialization
 * 
 * 4. Form objects:
 *    - Use formDefaults() to create initialized form state
 *    - Ensures all fields default to "" or their appropriate type
 */

/**
 * Creates a form state object with all string fields initialized to empty strings
 * and other fields to their appropriate defaults.
 * 
 * @example
 * const defaultEmployeeForm = formDefaults({
 *   first_name: '',
 *   last_name: '',
 *   email: '',
 *   age: 0,
 *   active: false
 * });
 */
export function formDefaults<T extends Record<string, unknown>>(template: T): T {
  return { ...template };
}

/**
 * Safely coerces a value to a string for controlled inputs.
 * Returns empty string for null, undefined.
 */
export function safeInputValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

/**
 * Safely coerces a value to a number for controlled number inputs.
 * Returns 0 for null, undefined, or NaN.
 */
export function safeNumberValue(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Creates an initial form state from field names.
 * All fields are initialized to empty strings.
 * 
 * @example
 * const initialState = createInitialFormState(['name', 'email', 'phone']);
 * // { name: '', email: '', phone: '' }
 */
export function createInitialFormState(fieldNames: string[]): Record<string, string> {
  return fieldNames.reduce((acc, field) => {
    acc[field] = "";
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Validates that all required fields have non-empty values.
 * Returns an object with field names as keys and error messages as values.
 */
export function validateRequiredFields(
  data: Record<string, unknown>,
  requiredFields: string[]
): Record<string, string> {
  const errors: Record<string, string> = {};
  
  for (const field of requiredFields) {
    const value = data[field];
    if (value === null || value === undefined || value === "") {
      errors[field] = `${formatFieldName(field)} is required`;
    }
  }
  
  return errors;
}

/**
 * Formats a field name for display (snake_case -> Title Case)
 */
function formatFieldName(fieldName: string): string {
  return fieldName
    .split(/[_-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Type-safe form field updater factory.
 * Creates an onChange handler for a specific field.
 * 
 * @example
 * const updateField = createFieldUpdater(setFormData);
 * <Input onChange={updateField('email')} />
 */
export function createFieldUpdater<T extends Record<string, unknown>>(
  setter: React.Dispatch<React.SetStateAction<T>>
) {
  return (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setter(prev => ({ ...prev, [field]: e.target.value }));
  };
}
