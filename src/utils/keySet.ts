import type { Evaluate } from "./evaluate.js"
import type { Narrow } from "./narrow.js"

export type KeySetKey = string | number

export type KeySet = Record<KeySetKey, 1>

/** Can be used as a more peformant Set for number/string values. */
export const keySet = <T extends KeySet>(keySet: Narrow<T>) =>
    keySet as Evaluate<T>

export const isKeyOf = <Obj extends object, K extends KeySetKey>(
    key: K,
    obj: Obj
): key is Extract<keyof Obj, K> => key in obj
