import type { Attributes } from "./attributes.js"

export const reduceRegex: Attributes.Reducer<[expression: RegExp]> = (
    base,
    expression
) => base
