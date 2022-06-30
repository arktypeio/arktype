import { toString } from "@re-/tools"
import { Generation, Validation } from "./features/index.js"
import { Parsing } from "./features/parsing.js"

export const pathAdd = (...subpaths: (string | number)[]) =>
    subpaths.filter((_) => _ !== "").join("/")

export const defToString = (def: unknown, indentation = ""): string => {
    if (typeof def === "string") {
        return def
    } else if (def instanceof RegExp) {
        return `/${def.source}/`
    } else if (typeof def === "object" && def !== null) {
        const isArray = Array.isArray(def)
        const nextIndentation = indentation + "    "
        let objDefToString = isArray ? "[\n" : "{\n"
        const defEntries = Object.entries(def)
        for (let i = 0; i < defEntries.length; i++) {
            objDefToString += nextIndentation
            if (!isArray) {
                objDefToString += defEntries[i][0] + ": "
            }
            objDefToString += defToString(defEntries[i][1], nextIndentation)
            if (i === defEntries.length - 1) {
                objDefToString += "\n"
            } else {
                objDefToString += ",\n"
            }
        }
        return objDefToString + indentation + (isArray ? "]" : "}")
    } else if (typeof def === "bigint") {
        return `${def}n`
    } else {
        return String(def)
    }
}

export const stringifyValue = (value: unknown) =>
    toString(value, {
        maxNestedStringLength: 50
    })

export const stringifyPathContext = (path: string) =>
    path ? ` at path ${path}` : ""

export type ModelOptions = {
    parse?: Parsing.Options
    validate?: Validation.Options
    generate?: Generation.Options
}

export type FilterToTuple<Value, Filter> = Value extends Filter ? [Value] : []
