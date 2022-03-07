import { typeDefProxy, createParser, validationError } from "../internal.js"
import { Builtin } from "../builtin.js"
import { HandledTypes, listKeywords } from "./internal.js"
import { extractableHandlers } from "./extractable.js"
import { unextractableHandlers } from "./unextractable.js"

export namespace Keyword {
    export type Definition<
        Def extends keyof KeywordTypes = keyof KeywordTypes
    > = Def

    export type Parse<Def extends Definition> = KeywordTypes[Def]

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Builtin.parse
        },
        {
            matches: (def) => def in handlers,
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

    const handlers = { ...extractableHandlers, ...unextractableHandlers }

    export const keywords = listKeywords(handlers)

    export type KeywordTypes = HandledTypes<typeof handlers>
}
