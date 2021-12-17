import { transform } from "@re-/utils"
import { Keyword, Primitive } from "./definition/index.js"
import { ExtractableDefinition } from "./internal.js"

export const typeOf = (value: any): ExtractableDefinition => {
    if (Primitive.parse.matches(value, {} as any)) {
        return value
    }
    if (typeof value === "function" || typeof value === "symbol") {
        return typeof value as Keyword.Extractable
    }
    if (typeof value === "string") {
        return `'${value}'`
    }
    if (typeof value === "object") {
        return transform(value, ([k, v]) => [k, typeOf(v)])
    }
    throw new Error(`Unexpected value type '${typeof value}'.`)
}
