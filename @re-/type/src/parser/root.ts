import type { NormalizedJsTypeName, NormalizedJsTypeOf } from "@re-/tools"
import { jsTypeOf } from "@re-/tools"
import type { ParseError, parseFn, ParserContext } from "./common.js"
import { throwParseError } from "./common.js"
import { Obj } from "./obj/obj.js"
import { Str } from "./str/str.js"

export namespace Root {
    export const parse: parseFn = (def, space) => {
        const defType = jsTypeOf(def)
        return defType === "string"
            ? Str.parse(def as any, space)
            : defType === "object" || defType === "array"
            ? Obj.parse(def as any, space)
            : throwParseError(buildBadDefinitionTypeMessage(defType))
    }

    export type parse<def, ctx extends ParserContext> = def extends string
        ? Str.Parse<def, ctx>
        : def extends BadDefinitionType
        ? ParseError<buildBadDefinitionTypeMessage<NormalizedJsTypeOf<def>>>
        : Obj.Parse<def, ctx>

    export type BadDefinitionType =
        | undefined
        | null
        | boolean
        | number
        | bigint
        | Function
        | symbol

    export const buildBadDefinitionTypeMessage = <
        actual extends NormalizedJsTypeName
    >(
        actual: actual
    ): buildBadDefinitionTypeMessage<actual> =>
        `Type definitions must be strings or objects (was ${actual}).`

    type buildBadDefinitionTypeMessage<actual extends NormalizedJsTypeName> =
        `Type definitions must be strings or objects (was ${actual}).`
}
