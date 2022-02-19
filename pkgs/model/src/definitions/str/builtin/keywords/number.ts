import { ElementOf, Evaluate, ListPossibleTypes, Narrow } from "@re-/tools"
import {
    typeDefProxy,
    valueGenerationError,
    createParser,
    InheritableMethodContext,
    validationError
} from "../internal.js"
import { Builtin } from "../builtin.js"
import { defineKeywords } from "./internal.js"

export namespace NumberKeyword {
    export type Definition<
        Def extends ElementOf<typeof names> = ElementOf<typeof names>
    > = Def

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

    const handlers = defineKeywords({})

    export const names = Object.keys(handlers) as ListPossibleTypes<
        keyof typeof handlers
    >
}
