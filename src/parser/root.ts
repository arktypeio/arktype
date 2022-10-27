import type { DynamicTypeName } from "../internal.js"
import { dynamicTypeOf } from "../internal.js"
import type {
    ParseError,
    ParserContext,
    StaticParserContext
} from "./common.js"
import { throwParseError } from "./common.js"
import { Str } from "./str/str.js"
import { Struct } from "./struct/struct.js"

export namespace Root {
    export const parse = (def: unknown, context: ParserContext) => {
        const defType = dynamicTypeOf(def)
        return defType === "string"
            ? Str.parse(def as any, context)
            : defType === "dictionary" || defType === "array"
            ? Struct.parse(def as any, defType, context)
            : throwParseError(buildBadDefinitionTypeMessage(defType))
    }

    export type parse<
        def,
        context extends StaticParserContext
    > = def extends string
        ? Str.parse<def, context>
        : def extends BadDefinitionType
        ? ParseError<buildBadDefinitionTypeMessage<dynamicTypeOf<def>>>
        : Struct.Parse<def, context>

    export type BadDefinitionType =
        | undefined
        | null
        | boolean
        | number
        | bigint
        | Function
        | symbol

    export const buildBadDefinitionTypeMessage = <
        actual extends DynamicTypeName
    >(
        actual: actual
    ): buildBadDefinitionTypeMessage<actual> =>
        `Type definitions must be strings or objects (was ${actual}).`

    type buildBadDefinitionTypeMessage<actual extends DynamicTypeName> =
        `Type definitions must be strings or objects (was ${actual}).`
}
