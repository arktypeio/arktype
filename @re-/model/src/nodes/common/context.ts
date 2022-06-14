import { isDigits, toString, uncapitalize } from "@re-/tools"
import type { Base as BaseNode } from "./kinds/base.js"

export type Node<DefType = unknown> = BaseNode<DefType>

export type Parser<DefType> = (def: DefType, ctx: ParseContext) => Node

export const typeDefProxy: any = new Proxy({}, { get: () => typeDefProxy })

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
    constructor(def: string, reason: string) {
        super(buildUngeneratableMessage(def, reason))
    }
}

export const buildUngeneratableMessage = (def: string, reason: string) =>
    `Unable to generate a value for '${def}': ${reason}`

export class RequiredCycleError extends UngeneratableError {
    constructor(def: string, seen: string[]) {
        super(
            def,
            `Definition includes a required cycle:\n${[...seen, def].join(
                "=>"
            )}\n` +
                `If you'd like to avoid throwing in when this occurs, pass a value to return ` +
                `when this occurs to the 'onRequiredCycle' option.`
        )
    }
}

export class ValidationError extends Error {}

export const pathAdd = (...subpaths: (string | number)[]) =>
    subpaths.filter((_) => _ !== "").join("/")

export type GenerateOptions = {
    /*
     * By default, generate will throw if it encounters a cyclic required type
     * If this options is provided, it will return its value instead
     */
    onRequiredCycle?: any
    verbose?: boolean
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

export type CustomValidatorArgs = {
    value: unknown
    errors: ErrorsByPath
    ctx: MethodContext<ValidateOptions>
    def: unknown
}

export type CustomValidator = (
    args: CustomValidatorArgs
) => undefined | string | ErrorsByPath

export const getErrorsFromCustomValidator = (
    validator: CustomValidator,
    args: CustomValidatorArgs
): ErrorsByPath => {
    const customErrors = validator(args)
    if (!customErrors) {
        return {}
    }
    if (typeof customErrors === "string") {
        return { [args.ctx.valuePath]: customErrors }
    }
    return customErrors
}

export type MethodContext<Config> = {
    valuePath: string
    seen: string[]
    shallowSeen: string[]
    config: Config
}

export type ResolutionMap = Record<string, Node>

export type ParseContext = {
    parsePath: string
    config: BaseOptions
    resolutions: ResolutionMap
    stringRoot: string | null
}

export const createRootParseContext = (
    config: BaseOptions = {},
    resolutions: ResolutionMap = {}
): ParseContext => {
    return {
        config,
        resolutions,
        parsePath: "",
        stringRoot: null
    }
}

export const createRootMethodContext = <Config>(
    config: Config
): MethodContext<Config> => {
    return {
        valuePath: "",
        seen: [],
        shallowSeen: [],
        config
    }
}

export type AllowsArgs = {
    value: unknown
    errors: ErrorsByPath
    ctx: MethodContext<ValidateOptions>
}

export type GenerateArgs = { ctx: MethodContext<GenerateOptions> }
