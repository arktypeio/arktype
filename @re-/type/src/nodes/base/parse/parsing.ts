import type { MetaDefinitions, SpaceMeta } from "../../../space.js"
import { defToString, stringifyPathContext, TypeOptions } from "../utils.js"
import { Node } from "./index.js"

export namespace Parsing {
    export type ParseFn<DefType = unknown> = (
        def: DefType,
        ctx: Context
    ) => Node

    export type InferenceContext = {
        dict: unknown
        meta: MetaDefinitions
        seen: Record<string, true>
    }

    /** Maps aliases to their definitions or to nodes parsed from their definitions */
    export type ResolutionMap = Record<string, unknown>

    export type Options = {
        // TODO: This doesn't exist anymore
        eager?: boolean
    }

    export type Config = Options

    export type Context = {
        path: string
        cfg: TypeOptions
        space: SpaceMeta | undefined
        shallowSeen: string[]
    }

    export const createContext = (
        cfg: TypeOptions = {},
        space?: SpaceMeta
    ): Context => {
        return {
            path: "",
            shallowSeen: [],
            cfg,
            space
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
        `Definition ${defToString(definition)}${stringifyPathContext(
            path
        )} ${description}`

    export class UnknownTypeError extends ParseError {
        constructor(def: string) {
            super(`Unable to determine the type of '${def}'.`)
        }
    }

    export type ErrorMessage<Message extends string = string> =
        `Error: ${Message}`
}
