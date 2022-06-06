import { toString } from "@re-/tools"
import { ModelConfig } from "../model.js"

export namespace Base {
    export type Parser<DefType> = (
        def: DefType,
        ctx: ParseContext
    ) => Node<DefType>

    export abstract class Node<DefType> {
        constructor(protected def: DefType, protected ctx: ParseContext) {}

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

        abstract validate(value: unknown, errors: ErrorsByPath): void
        abstract generate(): unknown
    }

    export type ParseContext = {
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
        path: "",
        seen: [],
        shallowSeen: [],
        stringRoot: null
    }

    export type ErrorsByPath = Record<string, string>

    export class ParseError extends Error {
        constructor(definition: unknown, path: string[], description: string) {
            super(buildParseErrorMessage(definition, path, description))
        }
    }

    export const stringifyDef = (def: unknown) =>
        toString(def, { quotes: "none", maxNestedStringLength: 50 })

    export const stringifyValue = (value: unknown) =>
        toString(value, {
            maxNestedStringLength: 50
        })

    export const stringifyPathContext = (path: string[]) =>
        path.length ? ` at path ${path.join("/")}` : ""

    /** Description should start with a verb, e.g. "is of invalid type 'function'" or "contains a shallow cycle" */
    export const buildParseErrorMessage = (
        definition: unknown,
        path: string[],
        description: string
    ) =>
        `Definition ${stringifyDef(definition)}${stringifyPathContext(
            path
        )} ${description}.`

    export const buildUnassignableErrorMessage = (
        def: unknown,
        value: unknown
    ) =>
        `${toString(value, {
            maxNestedStringLength: 50
        })} is not assignable to ${stringifyDef(def)}.`
}
