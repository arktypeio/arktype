import { ElementOf, Evaluate, ListPossibleTypes, Narrow } from "@re-/tools"
import {
    typeDefProxy,
    valueGenerationError,
    createParser,
    InheritableMethodContext,
    validationError
} from "./internal.js"
import { Builtin } from "./builtin.js"

export namespace Keyword {
    export type Definition<
        Def extends keyof KeywordsToTypes = keyof KeywordsToTypes
    > = Def

    export type Parse<Def extends Definition> = KeywordsToTypes[Def]

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Builtin.parse
        },
        {
            matches: (definition) => definition in handlers,
            generate: (ctx) => handlers[ctx.def].generate(ctx),
            validate: (ctx, valueType) => {
                return handlers[ctx.def].validate(valueType)
                    ? {}
                    : validationError({
                          def: ctx.def,
                          valueType,
                          path: ctx.ctx.path
                      })
            }
        }
    )

    export const delegate = parse as any as Definition

    const defineKeywords = <
        T extends Record<
            string,
            {
                generate: (
                    ctx: InheritableMethodContext<string, unknown>[0]
                ) => any
                validate: (
                    valueType: unknown,
                    ctx: InheritableMethodContext<string, unknown>[0]
                ) => boolean
            }
        >
    >(
        types: Narrow<T>
    ) => types as Evaluate<T>

    // These are the named types we can extract from a valueType at runtime
    const extractableHandlers = defineKeywords({
        // Values of these types cannot be meaningfully compared,
        // so they are extracted at the 'typeof' level
        symbol: {
            generate: () => Symbol(),
            validate: (valueType) => valueType === "symbol"
        },
        function: {
            generate:
                () =>
                (...args: any[]) =>
                    undefined as any,
            validate: (valueType) => valueType === "function"
        },
        // These can be represented via their respective primitives,
        // but are extracted as literals for clarity
        true: {
            generate: () => true as true,
            validate: (valueType) => valueType === "true"
        },
        false: {
            generate: () => false as false,
            validate: (valueType) => valueType === "false"
        },
        undefined: {
            generate: () => undefined,
            validate: (valueType) => valueType === "undefined"
        },
        null: {
            generate: () => null,
            validate: (valueType) => valueType === "null"
        }
    })

    export const extractableNames = Object.keys(
        extractableHandlers
    ) as ListPossibleTypes<keyof typeof extractableHandlers>

    export type Extractable = ElementOf<typeof extractableNames>

    /**
     * These types can be used to specify a type definition but
     * will never be used to represent a valueType at runtime, either
     * because they are abstract type constructs (e.g. "never") or
     * because a more specific type will always be extracted (e.g.
     * "boolean", which will always evaluate as "true" or "false")
     */
    const unextractableHandlers = defineKeywords({
        // Abstract types
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
            validate: (valueType) => typeof valueType === undefined
        },
        never: {
            generate: ({ def, ctx }) => {
                throw new Error(valueGenerationError({ def, ctx }))
            },
            validate: () => false
        },
        // Narrowable types
        object: {
            generate: () => ({} as object),
            validate: (valueType) => typeof valueType === "object"
        },
        boolean: {
            generate: () => false as boolean,
            validate: (valueType) =>
                valueType === "true" || valueType === "false"
        },
        string: {
            generate: () => "" as string,
            validate: (valueType) =>
                typeof valueType === "string" && !!valueType.match("'.*'")
        },
        // These types are extracted as primitives to avoid type widening
        // that occurs when inferring a number from a template string
        number: {
            generate: () => 0 as number,
            validate: (valueType) => typeof valueType === "number"
        },
        bigint: {
            generate: () => BigInt(0),
            validate: (valueType) => typeof valueType === "bigint"
        }
    })

    export const unextractableNames = Object.keys(
        extractableHandlers
    ) as ListPossibleTypes<keyof typeof unextractableHandlers>

    export type Unextractable = ElementOf<typeof unextractableNames>

    const handlers = { ...extractableHandlers, ...unextractableHandlers }

    export const names = [
        ...extractableNames,
        ...unextractableNames
    ] as any as ListPossibleTypes<Extractable | Unextractable>

    type KeywordsToTypes = {
        [K in keyof typeof handlers]: ReturnType<typeof handlers[K]["generate"]>
    }
}
