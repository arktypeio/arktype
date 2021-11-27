import { transform } from "@re-do/utils"
import { definitionTypeError } from "./components/errors.js"

export const format = <T>(definition: T): T => {
    const recurse = (definition: unknown, path: string[]): any => {
        if (typeof definition === "number") {
            return definition
        } else if (typeof definition === "string") {
            return definition.replace(/\s/g, "") as any
        } else if (typeof definition === "object") {
            return transform(definition as any, ([k, v]) => [
                k,
                recurse(v, [...path, k])
            ])
        } else {
            throw new Error(definitionTypeError(definition, path))
        }
    }
    return recurse(definition, [])
}
