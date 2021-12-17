import { Evaluate, Narrow } from "@re-/utils"
import {
    typeDefProxy,
    valueGenerationError,
    createParser,
    InheritableMethodContext,
    validationError
} from "./internal.js"
import { Literal } from "./literal.js"

export namespace Keyword {
    export type Definition<
        Def extends keyof KeywordsToTypes = keyof KeywordsToTypes
    > = Def

    export type Parse<Def extends Definition> = KeywordsToTypes[Def]

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Literal.parse
        },
        {
            matches: (definition) => definition in handlers,
            generate: (ctx) => handlers[ctx.def].generate(ctx),
            allows: (ctx, valueType) => {
                return handlers[ctx.def].allows(valueType)
                    ? {}
                    : validationError({
                          def: ctx.def,
                          valueType,
                          path: ctx.ctx.path
                      })
            },
            references: ({ def }, { includeBuiltIn }) =>
                includeBuiltIn ? [def] : []
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
                allows: (
                    valueType: unknown,
                    ctx: InheritableMethodContext<string, unknown>[0]
                ) => boolean
            }
        >
    >(
        types: Narrow<T>
    ) => types as Evaluate<T>

    // These are the named types we can extract from a valueType at runtime
    const extractable = defineKeywords({
        symbol: {
            generate: () => Symbol(),
            allows: (valueType) => valueType === "symbol"
        },
        function: {
            generate:
                () =>
                (...args: any[]) =>
                    undefined as any,
            allows: (valueType) => valueType === "function"
        }
    })

    export type Extractable = keyof typeof extractable

    /**
     * These types can be used to specify a type definition but
     * will never be used to represent a valueType at runtime, either
     * because they are abstract type constructs (e.g. "never") or
     * because a more specific type will always be extracted (e.g.
     * "boolean", which will always evaluate as "true" or "false")
     */
    const unextractable = defineKeywords({
        // Abstract types
        any: {
            generate: () => undefined as any,
            allows: () => true
        },
        unknown: {
            generate: () => undefined as unknown,
            allows: () => true
        },
        void: {
            generate: () => undefined as void,
            allows: (valueType) => typeof valueType === undefined
        },
        never: {
            generate: ({ def, ctx }) => {
                throw new Error(valueGenerationError({ def, ctx }))
            },
            allows: () => false
        },
        // Narrowable types
        object: {
            generate: () => ({} as object),
            allows: (valueType) => typeof valueType === "object"
        },
        boolean: {
            generate: () => false as boolean,
            allows: (valueType) => typeof valueType === "boolean"
        },
        string: {
            generate: () => "" as string,
            allows: (valueType) =>
                typeof valueType === "string" && !!valueType.match("'.*'")
        },
        number: {
            generate: () => 0 as number,
            allows: (valueType) => typeof valueType === "number"
        },
        bigint: {
            generate: () => BigInt(0),
            allows: (valueType) => typeof valueType === "bigint"
        },
        // Extracted as primitives
        true: {
            generate: () => true as true,
            allows: (valueType) => valueType === true
        },
        false: {
            generate: () => false as false,
            allows: (valueType) => valueType === false
        },
        undefined: {
            generate: () => undefined,
            allows: (valueType) => valueType === undefined
        },
        null: {
            generate: () => null,
            allows: (valueType) => valueType === null
        }
    })

    export type Unextractable = keyof typeof unextractable

    const handlers = { ...extractable, ...unextractable }

    type KeywordsToTypes = {
        [K in keyof typeof handlers]: ReturnType<typeof handlers[K]["generate"]>
    }
}
