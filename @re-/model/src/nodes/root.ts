import { IsAnyOrUnknown } from "@re-/tools"
import { Base } from "./base.js"
import { Literal } from "./literal/index.js"
import { Obj } from "./obj/index.js"
import { Str } from "./str/index.js"
import {
    DefinitionTypeError,
    ParseError,
    ParseErrorMessage,
    UnknownTypeError
} from "#errors"

export namespace Root {
    export type Validate<Def, Dict> = Def extends []
        ? Def
        : Def extends string
        ? Str.Validate<Def, Dict, Def>
        : Def extends BadDefinitionType
        ? ParseErrorMessage<DefinitionTypeError>
        : Def extends object
        ? Obj.Validate<Def, Dict>
        : Def extends Literal.Definition
        ? Def
        : ParseErrorMessage<UnknownTypeError>

    export type Parse<Def, Dict, Seen> = IsAnyOrUnknown<Def> extends true
        ? Def
        : Def extends string
        ? Str.Parse<Def, Dict, Seen>
        : Def extends BadDefinitionType
        ? ParseErrorMessage<DefinitionTypeError>
        : Def extends object
        ? Obj.Parse<Def, Dict, Seen>
        : Def extends Literal.Definition
        ? Def
        : ParseErrorMessage<UnknownTypeError>

    export type BadDefinitionType = Function | symbol

    export const matches: Base.Matcher<unknown, unknown> = (
        def
    ): def is unknown => true

    export const parse: Base.Parser<unknown> = (def, ctx) => {
        if (Str.matches(def, ctx)) {
            return Str.parse(def, ctx)
        }
        if (Obj.matches(def, ctx)) {
            return Obj.parse(def, ctx)
        }
        throw new ParseError(def, [], `is of disallowed type ${typeof def}.`)
    }
}
