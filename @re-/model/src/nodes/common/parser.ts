import { Alias } from "../str/alias.js"
import { Base } from "./kinds/base.js"
import { ModelOptions, stringifyDef, stringifyPathContext } from "./utils.js"

export namespace Parser {
    export type Node<DefType = unknown> = Base<DefType>

    export type Parser<DefType = unknown> = (
        def: DefType,
        ctx: Parser.Context
    ) => Node

    export type ResolutionMap = Record<string, Alias.Node>

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
        cfg: ModelOptions
    }

    export const createContext = (
        cfg: ModelOptions = {},
        resolutions: ResolutionMap = {}
    ): Context => {
        return {
            path: "",
            stringRoot: null,
            cfg,
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
