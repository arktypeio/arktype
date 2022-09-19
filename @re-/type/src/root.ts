import { Str } from "./parse/str.js"
import { Base } from "./traverse/base.js"
import { Obj } from "./traverse/types/nonTerminal/obj/index.js"

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

    export type Infer<
        Def,
        Ctx extends Base.InferenceContext
    > = unknown extends Def
        ? Def
        : Def extends string
        ? Str.Infer<Def, Ctx>
        : Obj.Infer<Def, Ctx>

    export type References<
        Def,
        Dict,
        PreserveStructure extends boolean
    > = Def extends string
        ? Str.References<Def, Dict>
        : Obj.References<Def, Dict, PreserveStructure>

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

    export const parse: Base.parseFn<unknown> = (def, ctx) =>
        typeof def === "string"
            ? Str.parse(def, ctx)
            : typeof def === "object" && def !== null
            ? Obj.parse(def, ctx)
            : Base.throwParseError(
                  badDefinitionTypeMessage +
                      ` (got ${typeof def}${
                          ctx.path.length
                              ? " at path " + ctx.path.join("/")
                              : ""
                      }).`
              )
}
