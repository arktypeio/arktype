import type { parseFn, ParserContext } from "./common.js"
import { throwParseError } from "./common.js"
import { Obj } from "./obj/obj.js"
import { Str } from "./str/str.js"

export namespace Root {
    export type Validate<Def, Ctx extends ParserContext> = Def extends []
        ? Def
        : Def extends string
        ? Str.Validate<Def, Ctx>
        : Def extends BadDefinitionType
        ? BadDefinitionTypeMessage
        : Obj.Validate<Def, Ctx>

    export type Parse<Def, Ctx extends ParserContext> = unknown extends Def
        ? Def
        : Def extends string
        ? Str.Parse<Def, Ctx>
        : Obj.Parse<Def, Ctx>

    export type BadDefinitionType =
        | undefined
        | null
        | boolean
        | number
        | bigint
        | Function
        | symbol

    const badDefinitionTypeMessage =
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
