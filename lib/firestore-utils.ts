/**
 * Utility functions for Firestore operations
 *
 * Firestore does not accept `undefined` as a field value. These utilities help
 * ensure data is safe for Firestore operations.
 */

/**
 * Remove undefined values from an object before saving to Firestore
 *
 * @param obj - Object that may contain undefined values
 * @returns New object with undefined values removed
 *
 * @example
 * const data = { name: "John", age: undefined, email: "john@example.com" };
 * const safeData = removeUndefined(data);
 * // Result: { name: "John", email: "john@example.com" }
 */
export const removeUndefined = <T extends Record<string, unknown>>(
  obj: T
): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  ) as Partial<T>;
};

/**
 * Type guard to ensure an object is safe for Firestore operations
 * Throws an error if undefined values are found
 *
 * @param obj - Object to check
 * @param fieldName - Optional field name for error message
 * @throws Error if undefined values are found
 *
 * @example
 * const data = { name: "John", age: undefined };
 * assertFirestoreSafe(data, "userData"); // Throws error
 */
export const assertFirestoreSafe = (
  obj: Record<string, unknown>,
  fieldName = "data"
): void => {
  const undefinedFields: string[] = [];

  const checkValue = (value: unknown, path: string): void => {
    if (value === undefined) {
      undefinedFields.push(path);
    } else if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      // Recursively check nested objects
      Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
        checkValue(val, path ? `${path}.${key}` : key);
      });
    }
  };

  Object.entries(obj).forEach(([key, value]) => {
    checkValue(value, key);
  });

  if (undefinedFields.length > 0) {
    throw new Error(
      `Firestore unsafe ${fieldName}: Found undefined values in fields: ${undefinedFields.join(
        ", "
      )}`
    );
  }
};

/**
 * Create a Firestore-safe object by removing undefined values
 * Optionally validates the result
 *
 * @param obj - Object that may contain undefined values
 * @param validate - Whether to validate the result (default: false)
 * @returns New object safe for Firestore operations
 */
export const makeFirestoreSafe = <T extends Record<string, unknown>>(
  obj: T,
  validate = false
): Partial<T> => {
  const safe = removeUndefined(obj);

  if (validate) {
    assertFirestoreSafe(safe as Record<string, unknown>);
  }

  return safe;
};
