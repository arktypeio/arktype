import { jsTypeOf } from "@re-/tools"
import type { ParseError, parseFn, ParserContext } from "./common.js"
import { throwParseError } from "./common.js"
import { Obj } from "./obj/obj.js"
import { Str } from "./str/str.js"

export namespace Root {
    export type Parse<Def, Ctx extends ParserContext> = Def extends string
        ? Str.Parse<Def, Ctx>
        : Def extends BadDefinitionType
        ? ParseError<BadDefinitionTypeMessage>
        : Obj.Parse<Def, Ctx>

    export type Validate<Def, Ast> = Def extends []
        ? Def
        : Ast extends ParseError<infer Message>
        ? Message
        : Def extends string
        ? Def
        : // @ts-expect-error We know K will also be in AST here because it must be a Struct
          { [K in keyof Def]: Validate<Def[K], Ast[K]> }

    export type BadDefinitionType =
        | undefined
        | null
        | boolean
        | number
        | bigint
        | Function
        | symbol

    export const badDefinitionTypeMessage =
        "Type definitions must be strings or objects."

    type BadDefinitionTypeMessage = typeof badDefinitionTypeMessage

    export const parse: parseFn = (def, ctx) =>
        typeof def === "string"
            ? Str.parse(def, ctx)
            : typeof def === "object" && def !== null
            ? Obj.parse(def, ctx)
            : throwParseError(
                  badDefinitionTypeMessage +
                      ` (was ${jsTypeOf(def)}${
                          ctx.path.length
                              ? " at path " + ctx.path.join("/")
                              : ""
                      }).`
              )
}
