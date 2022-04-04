export * from "../internal.js"
export * from "./parser.js"

export type ParseTypeContext = {
    delimiter: string
    modifiers: string
}

export type DefaultParseTypeContext = { delimiter: never; modifiers: never }
