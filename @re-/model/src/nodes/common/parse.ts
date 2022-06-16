import { Base } from "./kinds/base.js"
import { stringifyDef, stringifyPathContext } from "./utils.js"

export namespace Parser {
    export type Node<DefType = unknown> = Base<DefType>

    export type Parser<DefType = unknown> = (
        def: DefType,
        ctx: Parser.Context
    ) => Node

    export type ResolutionMap = Record<string, Node>

    export type Options = {
        eager?: boolean
    }

    export type Config = Required<Options>

    export const createConfig = (options?: Options): Config => ({
        ...options,
        eager: false
    })

    export type Context = {
        resolutions: ResolutionMap
        path: string
        stringRoot: string | null
        eager: boolean
    }

    export const createContext = (
        options?: Options,
        resolutions: ResolutionMap = {}
    ): Context => {
        return {
            path: "",
            stringRoot: null,
            eager: false,
            ...options,
            resolutions
        }
    }

    export class ParseError extends Error {
        constructor(message: string) {
            super(message)
        }
    }

    /** Description should start with a verb, e.g. "is of invalid type 'function'" or "contains a shallow cycle" */
    export const buildParseErrorMessage = (
        definition: unknown,
        path: string,
        description: string
    ) =>
        `Definition ${stringifyDef(definition)}${stringifyPathContext(
            path
        )} ${description}`

    export type ParseErrorMessage<Message extends string = string> =
        `Error: ${Message}`

    export type UnknownTypeError<
        Definition extends string = "your definition"
    > = `Unable to determine the type of ${Definition extends "your definition"
        ? Definition
        : `'${Definition}'`}.`
}
