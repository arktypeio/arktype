import { toString } from "@re-/tools"
import { ModelConfig } from "../model.js"

export type ParseContext = {
    path: string[]
    seen: string[]
    shallowSeen: string[]
    config: ModelConfig
    stringRoot: string | null
}

export const defaultParseContext: ParseContext = {
    config: {
        space: {
            dictionary: {},
            config: {}
        }
    },
    path: [],
    seen: [],
    shallowSeen: [],
    stringRoot: null
}

export type ParseFunction<T> = (def: T, ctx: ParseContext) => BaseNode<T>

export type Validator = (value: unknown, errors: Record<string, string>) => void

export type ErrorsByPath = Record<string, string>

export abstract class BaseNode<T> {
    constructor(protected def: T, protected ctx: ParseContext) {}

    abstract validate(value: unknown, errors: Record<string, string>): void
    abstract generate(): unknown
}

export interface ParentNode<T extends Parent, Parent> {
    matches: (def: Parent, ctx: ParseContext) => def is T
    parse: (def: T, ctx: ParseContext) => BaseNode<T>
}

export type BaseNodeClass<T extends Parent, Parent> = (new (
    def: T,
    ctx: ParseContext
) => BaseNode<T>) & {
    matches: (def: Parent) => def is T
}

export class ParseError extends Error {
    constructor(definition: unknown, path: string[], description: string) {
        super(buildParseErrorMessage(definition, path, description))
    }
}

export const stringifyDefinition = (def: unknown) =>
    toString(def, { quotes: "none", maxNestedStringLength: 50 })

export const stringifyPathContext = (path: string[]) =>
    path.length ? ` at path ${path.join("/")}` : ""

/** Description should start with a verb, e.g. "is of invalid type 'function'" or "contains a shallow cycle" */
export const buildParseErrorMessage = (
    definition: unknown,
    path: string[],
    description: string
) =>
    `Definition ${stringifyDefinition(definition)}${stringifyPathContext(
        path
    )} ${description}.`

export const buildUnassignableErrorMessage = (def: unknown, value: unknown) =>
    `${toString(value, {
        maxNestedStringLength: 50
    })} is not assignable to ${stringifyDefinition(def)}.`
