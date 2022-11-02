import type { array, dictionary } from "./dynamicTypes.js"
import { dynamicTypeOf } from "./dynamicTypes.js"

export const deepClone = <value>(value: value): value => {
    const valueType = dynamicTypeOf(value)
    return (
        valueType === "dictionary"
            ? deepCloneDictionary(value as dictionary)
            : valueType === "array"
            ? (value as array).map(deepClone)
            : value
    ) as value
}
const deepCloneDictionary = (value: dictionary) => {
    const result: dictionary = {}
    for (const k in value) {
        result[k] = deepClone(value[k])
    }
    return result
}
