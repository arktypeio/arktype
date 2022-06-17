import { IsAny, IsAnyOrUnknown } from "@re-/tools"
import { Common } from "./common.js"
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
        : Common.Parser.ParseErrorMessage<Common.Parser.UnknownTypeErrorMessage>

    export type Parse<Def, Dict, Seen> = IsAnyOrUnknown<Def> extends true
        ? Def
        : Def extends string
        ? Str.Parse<Def, Dict, Seen>
        : Def extends BadDefinitionType
        ? unknown
        : Def extends object
        ? Obj.Parse<Def, Dict, Seen>
        : Def extends Literal.Definition
        ? Def
        : IsAny<Dict> extends true
        ? any
        : unknown

    export type BadDefinitionType = Function | symbol

    type BadDefinitionTypeMessage<Def extends BadDefinitionType> =
        Common.Parser.ParseErrorMessage<`Values of type ${Def extends Function
            ? "function"
            : "symbol"} are not valid definitions.`>

    export const parse: Common.Parser.Parser<unknown> = (def, ctx) => {
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
        throw new Common.Parser.ParseError(
            `${
                ctx.path ? `At path ${ctx.path}, values` : "Values"
            } of type ${typeof def} are not valid definitions.`
        )
    }
}
