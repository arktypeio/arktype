import { isAlpha, isAlphaNumeric } from "@re-/tools"
import { Common } from "../common.js"

type KeywordHandlerMap = Record<string, Keyword.Handler>

// Just a no-op to narrow the handlers object so we can infer types from it
const defineKeywords = <Handlers extends KeywordHandlerMap>(
    handlers: Handlers
) => handlers

const handlers = defineKeywords({
    symbol: {
        generate: () => Symbol(),
        validate: (value) => typeof value === "symbol"
    },
    function: {
        generate:
            () =>
            // eslint-disable-next-line unicorn/consistent-function-scoping,@typescript-eslint/no-unused-vars
            (...args: any[]) =>
                undefined as any,
        validate: (value) => typeof value === "function"
    },
    true: {
        generate: () => true as const,
        validate: (value) => value === true
    },
    false: {
        generate: () => false as const,
        validate: (value) => value === false
    },
    undefined: {
        generate: () => undefined,
        validate: (value) => value === undefined
    },
    null: {
        generate: () => null,
        validate: (value) => value === null
    },
    any: {
        generate: () => undefined as any,
        validate: () => true
    },
    unknown: {
        generate: () => undefined as unknown,
        validate: () => true
    },
    void: {
        generate: () => undefined as void,
        validate: (value) => value === undefined
    },
    never: {
        generate: () => {
            throw new Common.Generate.UngeneratableError(
                "never",
                "never is ungeneratable by definition."
            )
        },
        validate: () => false
    },
    object: {
        generate: () => ({} as object),
        validate: (value) => typeof value === "object" && value !== null
    },
    boolean: {
        generate: () => false,
        validate: (value) => typeof value === "boolean"
    },
    number: {
        generate: () => 0,
        validate: (value) => typeof value === "number",
        isNumber: true
    },
    string: {
        generate: () => "",
        validate: (value) => typeof value === "string",
        isString: true
    },
    bigint: {
        generate: () => BigInt(0),
        validate: (value) => typeof value === "bigint"
    },
    // Number subtypes
    integer: {
        generate: () => 0,
        validate: (value) => Number.isInteger(value),
        isNumber: true
    },
    positive: {
        generate: () => 1,
        validate: (value) => typeof value === "number" && value > 0,
        isNumber: true
    },
    nonnegative: {
        generate: () => 0,
        validate: (value) => typeof value === "number" && value >= 0,
        isNumber: true
    },
    // String subtypes
    email: {
        generate: () => "david@redo.dev",
        validate: (value) =>
            typeof value === "string" && /^(.+)@(.+)\.(.+)$/.test(value),
        isString: true
    },
    alpha: {
        generate: () => "",
        validate: (value) => typeof value === "string" && isAlpha(value),
        isString: true
    },
    alphanumeric: {
        generate: () => "",
        validate: (value) => typeof value === "string" && isAlphaNumeric(value),
        isString: true
    },
    lowercase: {
        generate: () => "",
        validate: (value) =>
            typeof value === "string" && value === value.toLowerCase(),
        isString: true
    },
    uppercase: {
        generate: () => "",
        validate: (value) =>
            typeof value === "string" && value === value.toUpperCase(),
        isString: true
    },
    character: {
        generate: () => "a",
        validate: (value) => typeof value === "string" && value.length === 1,
        isString: true
    }
})

type Handlers = typeof handlers

type ExtractKeywordTypesFromHandlers = {
    [K in keyof Handlers]: ReturnType<Handlers[K]["generate"]>
}

type ExtractKeywordsByType<Identifier extends "isString" | "isNumber"> = {
    [Keyword in keyof Handlers]: Identifier extends keyof Handlers[Keyword]
        ? Keyword
        : never
}[keyof Handlers]

export namespace Keyword {
    export type Definition = keyof Types

    export type Types = ExtractKeywordTypesFromHandlers

    export type NumberOnly = ExtractKeywordsByType<"isNumber">

    export type StringOnly = ExtractKeywordsByType<"isString">

    export type Handler = {
        generate: (ctx: Common.Parser.Context) => unknown
        validate: (value: unknown, ctx: Common.Parser.Context) => boolean
        isString?: true
        isNumber?: true
    }

    export const getSubtypeHandlers = () => {
        const subtypeHandlers = {
            number: {} as KeywordHandlerMap,
            string: {} as KeywordHandlerMap
        }
        for (const [keyword, handler] of Object.entries(handlers)) {
            if ("isNumber" in handler) {
                subtypeHandlers.number[keyword] = handler
            }
            if ("isString" in handler) {
                subtypeHandlers.string[keyword] = handler
            }
        }
        return subtypeHandlers
    }

    export const matches = (def: string): def is Definition => def in handlers

    export class Node extends Common.Leaf<Definition> {
        allows(args: Common.Allows.Args) {
            if (!handlers[this.def].validate(args.value)) {
                this.addUnassignable(args)
            }
        }

        generate() {
            return handlers[this.def].generate()
        }
    }
}
