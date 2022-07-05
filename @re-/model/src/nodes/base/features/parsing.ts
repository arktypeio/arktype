import { SpaceDictionary } from "../../../space.js"
import { Node as AbstractNode } from "../kinds/node.js"
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
        dictionary: SpaceDictionary
        resolutions: ResolutionMap
        path: string
        stringRoot: string | null
        cfg: ModelOptions
    }

    export const createContext = (
        cfg: ModelOptions = {},
        dictionary: SpaceDictionary = {},
        resolutions: ResolutionMap = {}
    ): Context => {
        return {
            path: "",
            stringRoot: null,
            cfg,
            dictionary,
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
        `Definition ${defToString(definition)}${stringifyPathContext(
            path
        )} ${description}`

    export type ParseErrorMessage<Message extends string = string> =
        `Error: ${Message}`

    export class UnknownTypeError extends ParseError {
        constructor(def: string) {
            super(`Unable to determine the type of '${def}'.`)
        }
    }

    export type UnknownTypeErrorMessage<
        Definition extends string = "your definition"
    > = `Unable to determine the type of ${Definition extends "your definition"
        ? Definition
        : `'${Definition}'`}.`
}
