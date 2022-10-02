import type { NormalizedJsTypeName, NormalizedJsTypeOf } from "@re-/tools"
import { jsTypeOf } from "@re-/tools"
import type { ParseError, parseFn, ParserContext } from "./common.js"
import { throwParseError } from "./common.js"
import { Obj } from "./obj/obj.js"
import { Str } from "./str/str.js"

export namespace Root {
    export type Parse<Def, Ctx extends ParserContext> = Def extends string
        ? Str.Parse<Def, Ctx>
        : Def extends BadDefinitionType
        ? ParseError<BadDefinitionTypeMessage<NormalizedJsTypeOf<Def>>>
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

    export const badDefinitionTypeMessage = <
        Actual extends NormalizedJsTypeName
    >(
        actual: Actual
    ): BadDefinitionTypeMessage<Actual> =>
        `Type definitions must be strings or objects (was ${actual}).`

    type BadDefinitionTypeMessage<Actual extends NormalizedJsTypeName> =
        `Type definitions must be strings or objects (was ${Actual}).`

    export const parse: parseFn = (def, space) =>
        typeof def === "string"
            ? Str.parse(def, space)
            : typeof def === "object" && def !== null
            ? Obj.parse(def, space)
            : throwParseError(
                  badDefinitionTypeMessage + ` (was ${jsTypeOf(def)}).`
              )
}
