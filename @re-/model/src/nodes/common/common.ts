import { isDigits, toString, uncapitalize } from "@re-/tools"
import type { Space } from "../../space.js"
import type { Base as BaseNode } from "./kinds/base.js"

export type Node<DefType = unknown> = BaseNode<DefType>

export type Parser<DefType> = (def: DefType, ctx: ParseContext) => Node

export const typeDefProxy: any = new Proxy({}, { get: () => typeDefProxy })

export type ParseContext = {
    path: string
    config: BaseOptions
    space: Space | undefined
    stringRoot: string | null
}

export const defaultParseContext: ParseContext = {
    path: "",
    config: {},
    space: undefined,
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

export type GenerateOptions = {
    /*
     * By default, generate will throw if it encounters a cyclic required type
     * If this options is provided, it will return its value instead
     */
    onRequiredCycle?: any
}

export interface ParseConfig {
    eager?: boolean
}

export interface BaseOptions {
    parse?: ParseConfig
    validate?: ValidateOptions
    generate?: GenerateOptions
}

export type ValidateOptions = {
    ignoreExtraneousKeys?: boolean
    validator?: CustomValidator
    verbose?: boolean
}

export const errorsFromCustomValidator = (
    customValidator: CustomValidator,
    args: Parameters<CustomValidator>
): ErrorsByPath => {
    const result = customValidator(...args)
    if (result && typeof result === "string") {
        // @ts-ignore
        return validationError({ path: args[2].ctx.path, message: result })
    } else if (result) {
        return result as ErrorsByPath
    }
    return {}
}

export type CustomValidator = (
    value: unknown,
    errors: ErrorsByPath,
    ctx: ParseContext
) => string | ErrorsByPath

export type NodeMethodContext = {
    previousPath: string
    seen: string[]
    shallowSeen: string[]
}

export const defaultNodeMethodContext: NodeMethodContext = {
    previousPath: "",
    seen: [],
    shallowSeen: []
}

export interface BaseNodeMethodArgs<Options> {
    options: Options
    ctx: NodeMethodContext
}

export interface AllowsArgs extends BaseNodeMethodArgs<ValidateOptions> {
    value: unknown
    errors: ErrorsByPath
}

export interface GenerateArgs extends BaseNodeMethodArgs<GenerateOptions> {}
