import type { deepImmutable, mutable } from "./generics.js"
import type { dict } from "./typeOf.js"

export const deepFreeze = <value>(value: value): deepImmutable<value> =>
    (Object.isFrozen(value)
        ? value
        : Array.isArray(value)
        ? Object.freeze(value.map(deepFreeze))
        : // Object.isFrozen will always be true for non-objects, so we can safely cast to dict
          deepFreezeDict(value as dict)) as deepImmutable<value>

const deepFreezeDict = (value: dict) => {
    const result: mutable<dict> = {}
    for (const k in value) {
        result[k] = deepFreeze(value[k] as any)
    }
    return Object.freeze(result)
}
