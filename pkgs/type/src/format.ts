import { isRecursible, transform } from "@re-/utils"

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
