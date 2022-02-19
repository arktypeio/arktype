import { ElementOf, ListPossibleTypes } from "@re-/tools"
import {
    typeDefProxy,
    valueGenerationError,
    createParser,
    validationError
} from "../internal.js"
import { Builtin } from "../builtin.js"
import { defineKeywords } from "./internal.js"

export namespace UnextractableKeyword {
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
            allows: (ctx, valueType) => {
                return handlers[ctx.def].allows(valueType)
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
            allows: () => true
        },
        unknown: {
            generate: () => undefined as unknown,
            allows: () => true
        },
        void: {
            generate: () => undefined as void,
            allows: (valueType) => valueType === "undefined"
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
            allows: (valueType) => valueType === "true" || valueType === "false"
        },
        string: {
            generate: () => "" as string,
            allows: (valueType) =>
                typeof valueType === "string" && !!valueType.match("'.*'")
        },
        // These types are extracted as primitives to avoid type widening
        // that occurs when inferring a number from a template string
        number: {
            generate: () => 0 as number,
            allows: (valueType) => typeof valueType === "number"
        },
        bigint: {
            generate: () => BigInt(0),
            allows: (valueType) => typeof valueType === "bigint"
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
