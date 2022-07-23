import { IsAnyOrUnknown } from "@re-/tools"
import { Base } from "./base/index.js"
import { Literal } from "./literal.js"
import { Obj } from "./obj/index.js"
import { Str } from "./str/index.js"

export namespace Root {
    export type Validate<Def, Dict> = Def extends []
        ? Def
        : Def extends string
        ? Str.Validate<Def, Dict>
        : Def extends BadDefinitionType
        ? BadDefinitionTypeMessage<Def>
        : Def extends Obj.Unmapped | Literal.Definition
        ? Def
        : Obj.Validate<Def, Dict>

    export type TypeOf<Def, Dict, Meta, Seen> = IsAnyOrUnknown<Def> extends true
        ? Def
        : Def extends string
        ? Str.TypeOf<Def, Dict, Meta, Seen>
        : Def extends BadDefinitionType
        ? unknown
        : Def extends Literal.Definition
        ? Def
        : Obj.TypeOf<Def, Dict, Meta, Seen>

    export type References<
        Def,
        Dict,
        PreserveStructure extends boolean
    > = Def extends string
        ? Str.References<Def, Dict>
        : Def extends Literal.Definition
        ? [Literal.DefToString<Def>]
        : Def extends object
        ? Obj.References<Def, Dict, PreserveStructure>
        : []

    export type BadDefinitionType = Function | symbol

    type BadDefinitionTypeMessage<Def extends BadDefinitionType> =
        `Values of type ${Def extends Function
            ? "function"
            : "symbol"} are not valid definitions.`

    export const parse: Base.Parsing.Parser<unknown> = (def, ctx) => {
        if (Str.matches(def)) {
            ctx.stringRoot = def
            return Str.parse(def, ctx)
        }
        if (Obj.matches(def)) {
            return Obj.parse(def, ctx)
        }
        if (Literal.matches(def)) {
            return new Literal.Node(def, ctx)
        }
        throw new Base.Parsing.ParseError(
            `${
                ctx.path ? `At path ${ctx.path}, values` : "Values"
            } of type ${typeof def} are not valid definitions.`
        )
    }
}
