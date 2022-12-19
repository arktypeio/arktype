import type { deepImmutable, Dict, mutable } from "./generics.js"

export const deepFreeze = <value>(value: value): deepImmutable<value> =>
    (Object.isFrozen(value)
        ? value
        : Array.isArray(value)
        ? Object.freeze(value.map(deepFreeze))
        : // Object.isFrozen will always be true for non-objects, so we can safely cast to Dictionary
          deepFreezeDictionary(value as Dict)) as deepImmutable<value>

const deepFreezeDictionary = (value: Dict) => {
    const result: mutable<Dict> = {}
    for (const k in value) {
        result[k] = deepFreeze(value[k] as any)
    }
    return Object.freeze(result)
}
