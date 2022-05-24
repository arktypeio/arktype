import { typeOf } from "../../../../utils.js"
import { Reference } from "../reference.js"
import { extractableHandlers } from "./extractable.js"
import {
    createParser,
    HandledTypes,
    listKeywords,
    typeDefProxy,
    validationError
} from "./internal.js"
import { unextractableHandlers } from "./unextractable.js"

export namespace Keyword {
    export type Definition = keyof KeywordTypes

    export const type = typeDefProxy as Definition

    export const parser = createParser(
        {
            type,
            parent: () => Reference.parser
        },
        {
            matches: (def) => def in handlers,
            generate: (ctx) => handlers[ctx.def].generate(ctx),
            validate: (ctx, value) => {
                const valueType = typeOf(value)
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

    export const delegate = parser as any as Definition

    const handlers = { ...extractableHandlers, ...unextractableHandlers }

    export const keywords = listKeywords(handlers)

    export type KeywordTypes = HandledTypes<typeof handlers>
}
