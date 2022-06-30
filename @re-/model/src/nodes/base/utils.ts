import { toString } from "@re-/tools"
import { Generation, Validation } from "./features/index.js"
import { Parsing } from "./features/parsing.js"

export const pathAdd = (...subpaths: (string | number)[]) =>
    subpaths.filter((_) => _ !== "").join("/")

export const stringifyDef = (def: unknown) =>
    toString(def, { quote: "none", maxNestedStringLength: 50 })

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
