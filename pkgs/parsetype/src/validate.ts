import { transform, TreeOf } from "@re-do/utils"
import { BuiltInDefinition, ExtractableDefinition } from "common"

export type ExtractedDefinition = TreeOf<ExtractableDefinition>

export const validate = (value: any, type: any) => [] as any

export const typeOf = (value: any): ExtractedDefinition => {
    if (typeof value === "boolean") {
        return value ? "true" : "false"
    }
    if (typeof value === "object") {
        if (value === null) {
            return "null"
        }
        // if (Array.isArray(value)) {

        // }
        return transform(value, ([k, v]) => [k, typeOf(v)])
    }
    return typeof value as ExtractableDefinition
}
