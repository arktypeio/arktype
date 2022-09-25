import type { Space } from "../space.js"
import type { parseFn } from "./common.js"
import { throwParseError } from "./common.js"
import { Obj } from "./obj/obj.js"
import { Str } from "./str/str.js"

export namespace Root {
    export type Validate<D, S extends Space.Definition> = D extends []
        ? D
        : D extends string
        ? Str.Validate<D, S>
        : D extends BadDefinitionType
        ? BadDefinitionTypeMessage
        : Obj.Validate<D, S>

    export type Parse<D, S extends Space.Definition> = unknown extends D
        ? D
        : D extends string
        ? Str.Parse<D, S>
        : Obj.Parse<D, S>

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
