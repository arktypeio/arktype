import type { record } from "./dataTypes.js"
import { hasDataType, hasObjectSubtype } from "./dataTypes.js"
import type { mutable } from "./generics.js"

export const deepClone = <value>(value: value): value =>
    (hasDataType(value, "object")
        ? hasObjectSubtype(value, "array")
            ? value.map(deepClone)
            : deepCloneRecord(value as record)
        : value) as value

const deepCloneRecord = (value: record) => {
    const result: mutable<record> = {}
    for (const k in value) {
        result[k] = deepClone(value[k])
    }
    return result
}
