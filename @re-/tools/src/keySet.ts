import type { Evaluate } from "./evaluate.js"
import type { Narrow } from "./narrow.js"

export type KeySetKey = string | number

export type KeySet = Record<KeySetKey, 1>

/** Can be used as a more peformant Set for number/string values. */
export const keySet = <T extends KeySet>(keySet: Narrow<T>) =>
    keySet as Evaluate<T>

export const inKeySet = <Set extends KeySet>(
    key: KeySetKey,
    set: Set
): key is Extract<keyof Set, KeySetKey> => key in set
