import { Node } from "./node/index.js"
import { Obj } from "./obj/index.js"
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

    export type Infer<
        Def,
        Ctx extends Node.InferenceContext
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

    export const parse: Node.parseFn<unknown> = (def, ctx) =>
        typeof def === "string"
            ? Str.parse(def, ctx)
            : typeof def === "object" && def !== null
            ? Obj.parse(def, ctx)
            : Node.throwParseError(
                  badDefinitionTypeMessage +
                      ` (got ${typeof def}${Node.ctxToString(ctx)}).`
              )
}
