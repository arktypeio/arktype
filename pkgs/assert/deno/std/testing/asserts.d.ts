export declare class AssertionError extends Error {
    name: string
    constructor(message: string)
}
/**
 * Deep equality comparison used in assertions
 * @param c actual value
 * @param d expected value
 */
export declare function equal(c: unknown, d: unknown): boolean
/** Make an assertion, error will be thrown if `expr` does not have truthy value. */
export declare function assert(expr: unknown, msg?: string): asserts expr
/** Make an assertion, error will be thrown if `expr` have truthy value. */
export declare function assertFalse(
    expr: unknown,
    msg?: string
): asserts expr is false
/**
 * Make an assertion that `actual` and `expected` are equal, deeply. If not
 * deeply equal, then throw.
 *
 * Type parameter can be specified to ensure values under comparison have the same type.
 * For example:
 * ```ts
 * import { assertEquals } from "./asserts.ts";
 *
 * assertEquals<number>(1, 2)
 * ```
 */
export declare function assertEquals(
    actual: unknown,
    expected: unknown,
    msg?: string
): void
export declare function assertEquals<T>(
    actual: T,
    expected: T,
    msg?: string
): void
/**
 * Make an assertion that `actual` and `expected` are not equal, deeply.
 * If not then throw.
 *
 * Type parameter can be specified to ensure values under comparison have the same type.
 * For example:
 * ```ts
 * import { assertNotEquals } from "./asserts.ts";
 *
 * assertNotEquals<number>(1, 2)
 * ```
 */
export declare function assertNotEquals(
    actual: unknown,
    expected: unknown,
    msg?: string
): void
export declare function assertNotEquals<T>(
    actual: T,
    expected: T,
    msg?: string
): void
/**
 * Make an assertion that `actual` and `expected` are strictly equal. If
 * not then throw.
 *
 * ```ts
 * import { assertStrictEquals } from "./asserts.ts";
 *
 * assertStrictEquals(1, 2)
 * ```
 */
export declare function assertStrictEquals<T>(
    actual: unknown,
    expected: T,
    msg?: string
): asserts actual is T
/**
 * Make an assertion that `actual` and `expected` are not strictly equal.
 * If the values are strictly equal then throw.
 *
 * ```ts
 * import { assertNotStrictEquals } from "./asserts.ts";
 *
 * assertNotStrictEquals(1, 1)
 * ```
 */
export declare function assertNotStrictEquals(
    actual: unknown,
    expected: unknown,
    msg?: string
): void
export declare function assertNotStrictEquals<T>(
    actual: T,
    expected: T,
    msg?: string
): void
/**
 * Make an assertion that `actual` and `expected` are almost equal numbers through
 * a given tolerance. It can be used to take into account IEEE-754 double-precision
 * floating-point representation limitations.
 * If the values are not almost equal then throw.
 *
 * ```ts
 * import { assertAlmostEquals, assertThrows } from "./asserts.ts";
 *
 * assertAlmostEquals(0.1, 0.2);
 *
 * // Using a custom tolerance value
 * assertAlmostEquals(0.1 + 0.2, 0.3, 1e-16);
 * assertThrows(() => assertAlmostEquals(0.1 + 0.2, 0.3, 1e-17));
 * ```
 */
export declare function assertAlmostEquals(
    actual: number,
    expected: number,
    tolerance?: number,
    msg?: string
): void
declare type AnyConstructor = new (...args: any[]) => any
declare type GetConstructorType<T extends AnyConstructor> = T extends new (
    ...args: any
) => infer C
    ? C
    : never
/**
 * Make an assertion that `obj` is an instance of `type`.
 * If not then throw.
 */
export declare function assertInstanceOf<T extends AnyConstructor>(
    actual: unknown,
    expectedType: T,
    msg?: string
): asserts actual is GetConstructorType<T>
/**
 * Make an assertion that actual is not null or undefined.
 * If not then throw.
 */
export declare function assertExists<T>(
    actual: T,
    msg?: string
): asserts actual is NonNullable<T>
/**
 * Make an assertion that actual includes expected. If not
 * then throw.
 */
export declare function assertStringIncludes(
    actual: string,
    expected: string,
    msg?: string
): void
/**
 * Make an assertion that `actual` includes the `expected` values.
 * If not then an error will be thrown.
 *
 * Type parameter can be specified to ensure values under comparison have the same type.
 * For example:
 *
 * ```ts
 * import { assertArrayIncludes } from "./asserts.ts";
 *
 * assertArrayIncludes<number>([1, 2], [2])
 * ```
 */
export declare function assertArrayIncludes(
    actual: ArrayLike<unknown>,
    expected: ArrayLike<unknown>,
    msg?: string
): void
export declare function assertArrayIncludes<T>(
    actual: ArrayLike<T>,
    expected: ArrayLike<T>,
    msg?: string
): void
/**
 * Make an assertion that `actual` match RegExp `expected`. If not
 * then throw.
 */
export declare function assertMatch(
    actual: string,
    expected: RegExp,
    msg?: string
): void
/**
 * Make an assertion that `actual` not match RegExp `expected`. If match
 * then throw.
 */
export declare function assertNotMatch(
    actual: string,
    expected: RegExp,
    msg?: string
): void
/**
 * Make an assertion that `actual` object is a subset of `expected` object, deeply.
 * If not, then throw.
 */
export declare function assertObjectMatch(
    actual: Record<PropertyKey, any>,
    expected: Record<PropertyKey, unknown>
): void
/**
 * Forcefully throws a failed assertion
 */
export declare function fail(msg?: string): never
/**
 * Make an assertion that `error` is an `Error`.
 * If not then an error will be thrown.
 * An error class and a string that should be included in the
 * error message can also be asserted.
 */
export declare function assertIsError<E extends Error = Error>(
    error: unknown,
    ErrorClass?: new (...args: any[]) => E,
    msgIncludes?: string,
    msg?: string
): asserts error is E
/**
 * Executes a function, expecting it to throw.  If it does not, then it
 * throws. An error class and a string that should be included in the
 * error message can also be asserted. Or you can pass a
 * callback which will be passed the error, usually to apply some custom
 * assertions on it.
 */
export declare function assertThrows<E extends Error = Error>(
    fn: () => unknown,
    ErrorClass?: new (...args: any[]) => E,
    msgIncludes?: string,
    msg?: string
): void
export declare function assertThrows(
    fn: () => unknown,
    errorCallback: (e: Error) => unknown,
    msg?: string
): void
/**
 * Executes a function which returns a promise, expecting it to throw or reject.
 * If it does not, then it throws. An error class and a string that should be
 * included in the error message can also be asserted. Or you can pass a
 * callback which will be passed the error, usually to apply some custom
 * assertions on it.
 */
export declare function assertRejects<E extends Error = Error>(
    fn: () => Promise<unknown>,
    ErrorClass?: new (...args: any[]) => E,
    msgIncludes?: string,
    msg?: string
): Promise<void>
export declare function assertRejects(
    fn: () => Promise<unknown>,
    errorCallback: (e: Error) => unknown,
    msg?: string
): Promise<void>
/** Use this to stub out methods that will throw when invoked. */
export declare function unimplemented(msg?: string): never
/** Use this to assert unreachable code. */
export declare function unreachable(): never
export {}
