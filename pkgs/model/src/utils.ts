import { transform, TypeCategory } from "@re-/tools"
import { ExtractableDefinition } from "./internal.js"

export const typeOf = (value: any): ExtractableDefinition => {
    const typeMap: { [Category in TypeCategory]: () => ExtractableDefinition } =
        {
            string: () => `'${value}'`,
            number: () => value,
            bigint: () => value,
            object: () =>
                value === null
                    ? "null"
                    : transform(value, ([k, v]) => [k, typeOf(v)]),
            undefined: () => "undefined",
            symbol: () => "symbol",
            function: () => "function",
            boolean: () => (value ? "true" : "false")
        }
    return typeMap[typeof value]()
}
