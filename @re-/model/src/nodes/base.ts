import { isDigits, isEmpty, toString, uncapitalize } from "@re-/tools"
import { ModelConfig } from "../model.js"

export namespace Base {
    export type Parser<DefType> = (
        def: DefType,
        ctx: ParseContext
    ) => Node<unknown>

    export const typeDefProxy: any = new Proxy({}, { get: () => typeDefProxy })

    export abstract class Node<DefType> {
        constructor(protected def: DefType, protected ctx: ParseContext) {}

        get type() {
            return typeDefProxy
        }

        protected stringifyDef() {
            return stringifyDef(this.def)
        }

        protected addUnassignable(value: unknown, errors: ErrorsByPath) {
            errors[this.ctx.path] = `${stringifyValue(
                value
            )} is not assignable to ${this.stringifyDef()}.`
        }

        protected addUnassignableMessage(
            message: string,
            errors: ErrorsByPath
        ) {
            errors[this.ctx.path] = message
        }

        validateByPath(value: unknown) {
            const errorsByPath: ErrorsByPath = {}
            this.allows(value, errorsByPath)
            return errorsByPath
        }

        validate(value: unknown) {
            const errorsByPath = this.validateByPath(value)
            return isEmpty(errorsByPath)
                ? { data: value }
                : { error: stringifyErrors(errorsByPath), errorsByPath }
        }

        abstract allows(value: unknown, errors: ErrorsByPath): void
        abstract generate(): unknown
    }

    export abstract class NonTerminal<DefType> extends Node<DefType> {
        constructor(protected def: DefType, protected ctx: ParseContext) {
            super(def, ctx)
            if (ctx.eager) {
            }
        }

        abstract children: Record<string, () => Node<unknown>>

        private cache: Record<string, Node<unknown>> = {}

        protected child(name: string) {
            if (!(name in this.cache)) {
                this.cache[name] = this.children[name]()
            }
            return this.cache[name]
        }
    }

    export type ParseContext = {
        eager: boolean
        path: string
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
        path ? "" : ` at path ${path}`

    /** Description should start with a verb, e.g. "is of invalid type 'function'" or "contains a shallow cycle" */
    export const buildParseErrorMessage = (
        definition: unknown,
        path: string,
        description: string
    ) =>
        `Definition ${stringifyDef(definition)}${stringifyPathContext(
            path
        )} ${description}.`

    export const buildUnassignableErrorMessage = (
        def: unknown,
        value: unknown
    ) => `${stringifyValue(value)})} is not assignable to ${stringifyDef(def)}.`

    export const stringifyErrors = (errors: ErrorsByPath) => {
        const errorPaths = Object.keys(errors)
        if (errorPaths.length === 0) {
            return ""
        }
        if (errorPaths.length === 1) {
            const errorPath = errorPaths[0]
            return `${
                errorPath
                    ? `At ${
                          isDigits(errorPath) ? "index" : "path"
                      } ${errorPath}, `
                    : ""
            }${errorPath ? uncapitalize(errors[errorPath]) : errors[errorPath]}`
        }
        return `Encountered errors at the following paths:\n${toString(errors, {
            indent: 2
        })}`
    }

    export type ParseErrorMessage<Message extends string = string> =
        `Error: ${Message}`

    export type UnknownTypeError<
        Definition extends string = "your definition"
    > = `Unable to determine the type of ${Definition extends "your definition"
        ? Definition
        : `'${Definition}'`}.`

    export class UngeneratableError extends Error {
        constructor(def: string, defType: string) {
            super(ungeneratableError(def, defType))
        }
    }

    export const ungeneratableError = (def: string, defType: string) =>
        `Unable to generate a value for '${def}' (${defType} generation is unsupported).`
}
