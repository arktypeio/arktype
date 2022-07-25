import { Base } from "./base/index.js"
import { Obj } from "./obj/index.js"
import { Str } from "./str/index.js"

export namespace Root {
    export type Validate<Def, Dict> = Def extends []
        ? Def
        : Def extends string
        ? Str.Validate<Def, Dict>
        : Def extends Obj.Unmapped
        ? Def
        : Def extends BadDefinitionType
        ? BadDefinitionTypeMessage
        : Obj.Validate<Def, Dict>

    export type TypeOf<
        Def,
        Ctx extends Base.Parsing.InferenceContext
    > = unknown extends Def
        ? Def
        : Def extends string
        ? Str.TypeOf<Def, Ctx>
        : Def extends BadDefinitionType
        ? never
        : Obj.TypeOf<Def, Ctx>

    export type References<
        Def,
        Dict,
        PreserveStructure extends boolean
    > = Def extends string
        ? Str.References<Def, Dict>
        : Def extends object
        ? Obj.References<Def, Dict, PreserveStructure>
        : []

    export type BadDefinitionType =
        | undefined
        | null
        | boolean
        | number
        | bigint
        | Function
        | symbol

    const BAD_DEF_TYPE_MESSAGE = "Type definitions must be strings or objects"

    type BadDefinitionTypeMessage = typeof BAD_DEF_TYPE_MESSAGE

    export const parse: Base.Parsing.Parser<unknown> = (def, ctx) => {
        if (Str.matches(def)) {
            return Str.parse(def, ctx)
        }
        if (Obj.matches(def)) {
            return Obj.parse(def, ctx)
        }
        throw new Base.Parsing.ParseError(
            BAD_DEF_TYPE_MESSAGE +
                ` (got ${typeof def}${ctx.path ? ` at path ${ctx.path}` : ""}).`
        )
    }
}
