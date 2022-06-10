import { IsAnyOrUnknown } from "@re-/tools"
import { Literal } from "./literal/index.js"
import { Obj } from "./obj/index.js"
import { Str } from "./str/index.js"
import { Common } from "#common"

export namespace Root {
    export type Validate<Def, Dict> = Def extends []
        ? Def
        : Def extends string
        ? Str.Validate<Def, Dict, Def>
        : Def extends BadDefinitionType
        ? Common.ParseErrorMessage<"Values of type 'function' or 'symbol' are not valid definitions.">
        : Def extends Obj.Terminal
        ? Def
        : Def extends object
        ? Obj.Validate<Def, Dict>
        : Def extends Literal.Definition
        ? Def
        : Common.ParseErrorMessage<Common.UnknownTypeError>

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
        : unknown

    export type BadDefinitionType = Function | symbol

    export const parse: Common.Parser<unknown> = (def, ctx) => {
        if (Str.matches(def)) {
            return Str.parse(def, ctx)
        }
        if (Obj.matches(def)) {
            return Obj.parse(def, ctx)
        }
        if (Literal.matches(def)) {
            return new Literal.Node(def, ctx)
        }
        throw new Common.ParseError(
            Common.buildParseErrorMessage(
                def,
                ctx.path,
                `is of disallowed type ${typeof def}.`
            )
        )
    }
}
