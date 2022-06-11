import { isDigits, toString, uncapitalize } from "@re-/tools"
import { BaseOptions } from "../../model.js"
import { ConfiguredSpace } from "../../space.js"
import type { Base as BaseNode } from "./kinds/base.js"

export type Node<DefType = unknown> = BaseNode<DefType>

export type Parser<DefType> = (def: DefType, ctx: ParseContext) => Node

export const typeDefProxy: any = new Proxy({}, { get: () => typeDefProxy })

export type ParseContext = {
    eager: boolean
    path: string
    seen: string[]
    shallowSeen: string[]
    config: BaseOptions
    space: ConfiguredSpace
    stringRoot: string | null
}

export const defaultParseContext: ParseContext = {
    config: {},
    space: {
        dictionary: {},
        config: {}
    },
    eager: false,
    path: "",
    seen: [],
    shallowSeen: [],
    stringRoot: null
}

export type ErrorsByPath = Record<string, string>

export class ParseError extends Error {
    constructor(message: string) {
        super(message)
    }
}

export const stringifyDef = (def: unknown) =>
    toString(def, { quotes: "none", maxNestedStringLength: 50 })

export const stringifyValue = (value: unknown) =>
    toString(value, {
        maxNestedStringLength: 50
    })

export const stringifyPathContext = (path: string) =>
    path ? ` at path ${path}` : ""

/** Description should start with a verb, e.g. "is of invalid type 'function'" or "contains a shallow cycle" */
export const buildParseErrorMessage = (
    definition: unknown,
    path: string,
    description: string
) =>
    `Definition ${stringifyDef(definition)}${stringifyPathContext(
        path
    )} ${description}`

export const buildUnassignableErrorMessage = (def: unknown, value: unknown) =>
    `${stringifyValue(value)})} is not assignable to ${stringifyDef(def)}.`

export const stringifyErrors = (errors: ErrorsByPath) => {
    const errorPaths = Object.keys(errors)
    if (errorPaths.length === 0) {
        return ""
    }
    if (errorPaths.length === 1) {
        const errorPath = errorPaths[0]
        return `${
            errorPath
                ? `At ${isDigits(errorPath) ? "index" : "path"} ${errorPath}, `
                : ""
        }${errorPath ? uncapitalize(errors[errorPath]) : errors[errorPath]}`
    }
    return `Encountered errors at the following paths:\n${toString(errors, {
        indent: 2
    })}`
}

export type ParseErrorMessage<Message extends string = string> =
    `Error: ${Message}`

export type UnknownTypeError<Definition extends string = "your definition"> =
    `Unable to determine the type of ${Definition extends "your definition"
        ? Definition
        : `'${Definition}'`}.`

export class UngeneratableError extends Error {
    constructor(def: string, defType: string) {
        super(ungeneratableError(def, defType))
    }
}

export const ungeneratableError = (def: string, defType: string) =>
    `Unable to generate a value for '${def}' (${defType} generation is unsupported).`

export const appendToPath = (path: string, segment: string | number) =>
    path ? `${path}/${segment}` : String(segment)
