import type { SpaceMeta } from "../../../space.js"
import type { Node as AbstractNode } from "../kinds/node.js"
import { defToString, ModelOptions, stringifyPathContext } from "../utils.js"

export namespace Parsing {
    export type Node<DefType = unknown> = AbstractNode<DefType>

    export type Parser<DefType = unknown> = (def: DefType, ctx: Context) => Node

    /** Maps aliases to their definitions or to nodes parsed from their definitions */
    export type ResolutionMap = Record<string, unknown>

    export type Options = {
        eager?: boolean
    }

    export type Config = Options

    export type ConstraintValidator = (value: unknown) => string | undefined

    export type Context = {
        path: string
        stringRoot: string | null
        cfg: ModelOptions
        space: SpaceMeta | undefined
        shallowSeen: string[]
    }

    export const createContext = (
        cfg: ModelOptions = {},
        space?: SpaceMeta
    ): Context => {
        return {
            path: "",
            stringRoot: null,
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
