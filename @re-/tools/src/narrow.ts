import { CastWithExclusion } from "./common.js"

export type Narrowable = string | boolean | number | bigint

// Checking for the empty tuple ensures arrays are narrowed to tuples
export type NarrowRecurse<T> = {
    [K in keyof T]: T[K] extends Narrowable | [] ? T[K] : NarrowRecurse<T[K]>
}

export type Narrow<T> = CastWithExclusion<T, NarrowRecurse<T>, []>

/**
 * NOTE: Narrowing 'unknown' results in an empty object ({}).
 * I'm not sure how to change this without breaking complex types
 * in packages like @re-/model that rely heavily on Narrow.
 *
 */
export const narrow = <T>(arg: Narrow<T>) => arg as T
