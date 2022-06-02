import { IsAnyOrUnknown } from "@re-/tools"
import {
    DefinitionTypeError,
    ParseError,
    ParseErrorMessage,
    UnknownTypeError
} from "../errors.js"
import { Literal } from "./literal/index.js"
import { Node, ParseFunction } from "./node.js"
import { Obj } from "./obj/index.js"
import { Str } from "./str/index.js"

export namespace Root {
    export type Validate<Def, Dict> = Def extends []
        ? Def
        : Def extends BadDefinitionType
        ? ParseErrorMessage<DefinitionTypeError>
        : Def extends string
        ? Str.Validate<Def, Dict, Def>
        : Def extends Literal.Definition
        ? Def
        : Def extends object
        ? { [K in keyof Def]: Validate<Def[K], Dict> }
        : ParseErrorMessage<UnknownTypeError>

    export type Parse<Def, Dict, Seen> = IsAnyOrUnknown<Def> extends true
        ? Def
        : Def extends BadDefinitionType
        ? ParseErrorMessage<DefinitionTypeError>
        : Def extends string
        ? Str.Parse<Def, Dict, Seen>
        : Def extends RegExp
        ? string
        : Def extends object
        ? Obj.Parse<Def, Dict, Seen>
        : Def extends Literal.PrimitiveLiteral
        ? Def
        : ParseErrorMessage<UnknownTypeError>

    export type BadDefinitionType = Function | symbol

    export const node: Node<any, any> = {
        matches: () => true,
        children: [Str.node]
    }

    export const parse: ParseFunction<unknown> = (def, ctx) => {
        const defType = typeof def
        if (defType === "string") {
            return Str.parse(def, ctx)
        }
        throw new Error("hi")
        // if (defType === "function" || defType === "symbol") {
        //     throw new ParseError(def, [], `is of disallowed type ${defType}.`)
        // }
    }
}
