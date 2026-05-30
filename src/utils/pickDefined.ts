/** Removes keys whose values are strictly `undefined`. */
export type WithoutUndefined<T extends Record<string, unknown>> = {
  [K in keyof T as undefined extends T[K] ? never : K]: Exclude<T[K], undefined>;
};

/**
 * Returns a shallow copy containing only properties with defined values.
 *
 * Useful with `exactOptionalPropertyTypes` when assigning optional fields.
 *
 * @param values - Source object that may contain `undefined` values.
 * @returns Shallow copy without `undefined` entries.
 */
export function pickDefined<T extends Record<string, unknown>>(values: T): WithoutUndefined<T> {
  return Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, NonNullable<unknown>] => entry[1] !== undefined),
  ) as WithoutUndefined<T>;
}
