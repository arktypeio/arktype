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

    export const parse: parseFn = (definition, context) =>
        typeof definition === "string"
            ? Str.parse(definition, context)
            : typeof definition === "object" && definition !== null
            ? Obj.parse(definition, context)
            : throwParseError(
                  badDefinitionTypeMessage +
                      ` (was ${typeof definition}${
                          context.path.length
                              ? " at path " + context.path.join("/")
                              : ""
                      }).`
              )
}
