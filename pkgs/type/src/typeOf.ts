import { transform } from "@re-do/utils"
import {
    ExtractableDefinition,
    ExtractableTypeName
} from "./components/internal.js"

export const typeOf = (value: any): ExtractableDefinition => {
    if (typeof value === "boolean") {
        return value ? "true" : "false"
    }
    if (typeof value === "string") {
        return `'${value}'`
    }
    if (typeof value === "number") {
        return value
    }
    if (typeof value === "object") {
        if (value === null) {
            return "null"
        }
        return transform(value, ([k, v]) => [k, typeOf(v)])
    }
    return typeof value as ExtractableTypeName
}
