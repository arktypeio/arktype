import type { DynamicTypeName } from "../internal.js"
import type { AttributeReducer } from "./shared.js"

export namespace Typed {
    export type Attribute = DynamicTypeName | "never"

    export const reduce: AttributeReducer<"typed"> = (base, value) =>
        base === undefined
            ? value === "null" || value === "undefined"
                ? [value, { equals: value }]
                : // TODO: Should check for never here?
                  [value]
            : base === value
            ? []
            : "never"
}
