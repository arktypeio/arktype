import { isAlpha, isAlphaNumeric } from "@re-/tools"
import { UngeneratableError } from "#errors"
import { BaseNodeClass, ParseContext, TerminalNode } from "#node"

type KeywordHandler<T> = {
    generate: (ctx: ParseContext) => T
    validate: (value: T, ctx: ParseContext) => boolean
}

type KeywordMap<T> = Record<string, KeywordHandler<T>>

type DefineKeywords<T> = <Map extends KeywordMap<T>>(handlers: Map) => Map

type HandledTypes<Handlers extends KeywordMap<any>> = {
    [K in keyof Handlers]: ReturnType<Handlers[K]["generate"]>
}

const defineKeywords: DefineKeywords<unknown> = (handlers) => handlers

const keywords = defineKeywords({
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
        validate: (value) => value === "true"
    },
    false: {
        generate: () => false as const,
        validate: (value) => value === "false"
    },
    undefined: {
        generate: () => undefined,
        validate: (value) => value === "undefined"
    },
    null: {
        generate: () => null,
        validate: (value) => value === "null"
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
        validate: (value) => value === "undefined"
    },
    never: {
        generate: () => {
            throw new UngeneratableError("never", "never")
        },
        validate: () => false
    },
    object: {
        generate: () => ({} as object),
        validate: (value) => typeof value === "object"
    },
    boolean: {
        generate: () => false,
        validate: (value) => typeof value === "boolean"
    },
    number: {
        generate: () => 0,
        validate: (value) => typeof value === "number"
    },
    string: {
        generate: () => "",
        validate: (value) => typeof value === "string"
    },
    bigint: {
        generate: () => BigInt(0),
        validate: (value) => typeof value === "bigint"
    },
    // Number subtypes
    integer: {
        generate: () => 0,
        validate: (value) => Number.isInteger(value)
    },
    positive: {
        generate: () => 1,
        validate: (value) => typeof value === "number" && value > 0
    },
    nonnegative: {
        generate: () => 0,
        validate: (value) => typeof value === "number" && value >= 0
    },
    // String subtypes
    email: {
        generate: () => "david@redo.dev",
        validate: (value) =>
            typeof value === "string" && /^(.+)@(.+)$/.test(value)
    },
    alpha: {
        generate: () => "",
        validate: (value) => typeof value === "string" && isAlpha(value)
    },
    alphanumeric: {
        generate: () => "",
        validate: (value) => typeof value === "string" && isAlphaNumeric(value)
    },
    lowercase: {
        generate: () => "",
        validate: (value) =>
            typeof value === "string" && value === value.toLowerCase()
    },
    uppercase: {
        generate: () => "",
        validate: (value) =>
            typeof value === "string" && value === value.toUpperCase()
    },
    character: {
        generate: () => "a",
        validate: (value) => typeof value === "string" && value.length === 1
    }
})

export namespace Keyword {
    export type Definition = keyof Types

    export type Types = HandledTypes<typeof keywords>

    export const Node: BaseNodeClass<
        Definition,
        string
    > = class extends TerminalNode<Definition> {
        static matches(def: string): def is Definition {
            return def in keywords
        }

        validate(value: unknown) {
            return keywords[this.def].validate(value)
        }

        generate() {
            return keywords[this.def].generate()
        }
    }
}
