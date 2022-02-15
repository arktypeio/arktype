import { transform, TypeCategory, isRecursible } from "@re-/tools"
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

export const format = <T>(definition: T): T => {
    const recurse = (definition: unknown): any => {
        if (typeof definition === "string") {
            return definition.replace(/\s/g, "") as any
        } else if (isRecursible(definition)) {
            return transform(definition as any, ([k, v]) => [k, recurse(v)])
        } else {
            // Non-string primitives can't be formatted or recursed into
            return definition
        }
    }
    return recurse(definition)
}
