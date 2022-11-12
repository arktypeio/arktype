import type { DynamicState } from "./reduce/dynamic.js"
import type { Scanner } from "./reduce/scanner.js"
import type { state, StaticState } from "./reduce/static.js"
import type { NumberLiteral } from "./utils/numericLiterals.js"

export class ParseError extends Error {}

export const throwParseError = (message: string) => {
    throw new ParseError(message)
}
