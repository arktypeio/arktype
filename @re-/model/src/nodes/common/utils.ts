import { toString } from "@re-/tools"
import { Parser } from "./parser.js"
import { Allows, Generate } from "./traverse/index.js"

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
    parse?: Parser.Options
    validate?: Allows.Options
    generate?: Generate.Options
}
