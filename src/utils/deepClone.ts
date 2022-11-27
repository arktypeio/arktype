import type { dict } from "./dataTypes.js"
import { hasType, hasObjectSubtype } from "./dataTypes.js"
import type { mutable } from "./generics.js"

export const deepClone = <value>(value: value): value =>
    (hasType(value, "object")
        ? hasObjectSubtype(value, "array")
            ? value.map(deepClone)
            : deepCloneRecord(value as dict)
        : value) as value

const deepCloneRecord = (value: dict) => {
    const result: mutable<dict> = {}
    for (const k in value) {
        result[k] = deepClone(value[k])
    }
    return result
}
