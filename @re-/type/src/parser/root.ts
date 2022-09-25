import type { parseFn } from "./common.js"
import { throwParseError } from "./common.js"
import { Obj } from "./obj/obj.js"
import { Str } from "./str/str.js"

export namespace Root {
    export type Validate<Def, Dict> = Def extends []
        ? Def
        : Def extends string
        ? Str.Validate<Def, Dict>
        : Def extends BadDefinitionType
        ? BadDefinitionTypeMessage
        : Obj.Validate<Def, Dict>

    export type Parse<Def, Dict> = unknown extends Def
        ? Def
        : Def extends string
        ? Str.Parse<Def, Dict>
        : Obj.Parse<Def, Dict>

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
