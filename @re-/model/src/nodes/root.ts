import { ElementOf, IsAny, IsAnyOrUnknown } from "@re-/tools"
import { Base } from "./base/index.js"
import { Literal } from "./literal/index.js"
import { Obj } from "./obj/index.js"
import { Str } from "./str/index.js"

export namespace Root {
    export type Validate<Def, Dict> = Def extends []
        ? Def
        : Def extends string
        ? Str.Validate<Def, Dict, Def>
        : Def extends BadDefinitionType
        ? BadDefinitionTypeMessage<Def>
        : Def extends Obj.Leaves
        ? Def
        : Def extends object
        ? Obj.Validate<Def, Dict>
        : Def extends Literal.Definition
        ? Def
        : Base.Parsing.ParseErrorMessage<Base.Parsing.UnknownTypeErrorMessage>

    export type Parse<Def, Dict, Seen> = IsAnyOrUnknown<Def> extends true
        ? Def
        : Def extends string
        ? Def extends Base.Parsing.ParseErrorMessage
            ? unknown
            : Str.Parse<Def, Dict, Seen>
        : Def extends BadDefinitionType
        ? unknown
        : Def extends object
        ? Obj.Parse<Def, Dict, Seen>
        : Def extends Literal.Definition
        ? Def
        : IsAny<Dict> extends true
        ? any
        : unknown

    export type References<
        Def,
        Filter,
        PreserveStructure extends boolean,
        PreserveOrder extends boolean
    > = Def extends string
        ? Def extends Base.Parsing.ParseErrorMessage
            ? []
            : PreserveOrder extends true
            ? Str.References<Def, Filter>
            : ElementOf<Str.References<Def, Filter>>[]
        : Def extends object
        ? Obj.References<Def, Filter, PreserveStructure, PreserveOrder>
        : Def extends Literal.Definition
        ? Literal.References<Def, Filter>
        : []

    export type BadDefinitionType = Function | symbol

    type BadDefinitionTypeMessage<Def extends BadDefinitionType> =
        Base.Parsing.ParseErrorMessage<`Values of type ${Def extends Function
            ? "function"
            : "symbol"} are not valid definitions.`>

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
