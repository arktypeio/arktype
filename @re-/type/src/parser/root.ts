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

    export const parse: parseFn = (def, context) =>
        typeof def === "string"
            ? Str.parse(def, context)
            : typeof def === "object" && def !== null
            ? Obj.parse(def, context)
            : throwParseError(
                  badDefinitionTypeMessage +
                      ` (was ${typeof def}${
                          context.path.length
                              ? " at path " + context.path.join("/")
                              : ""
                      }).`
              )
}
