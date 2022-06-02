import { IsAnyOrUnknown } from "@re-/tools"
import {
    DefinitionTypeError,
    ParseError,
    ParseErrorMessage,
    typeDefProxy,
    UnknownTypeError
} from "./internal.js"
import { Literal } from "./literal/index.js"
import { Obj } from "./obj/index.js"
import { createParser, reroot } from "./parser.js"
import { Str } from "./str/index.js"

export namespace Root {
    export type Validate<Def, Dict> = Def extends []
        ? Def
        : Def extends BadDefinitionType
        ? ParseErrorMessage<DefinitionTypeError>
        : Def extends string
        ? Str.FastValidate<Def, Dict, Def>
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
        ? Str.FastParse<Def, Dict, Seen>
        : Def extends RegExp
        ? string
        : Def extends object
        ? Obj.FastParse<Def, Dict, Seen>
        : Def extends Literal.PrimitiveLiteral
        ? Def
        : ParseErrorMessage<UnknownTypeError>

    export type BadDefinitionType = Function | symbol

    export const type = typeDefProxy

    export const parse = (def: unknown) => {
        const defType = typeof def
        if (defType === "string") {
            return
        }
        if (defType === "function" || defType === "symbol") {
            throw new ParseError(def, [], `is of disallowed type ${defType}.`)
        }
    }

    export const parser = createParser(
        {
            type,
            parent: () => reroot,
            children: () => [Literal.delegate, Str.delegate, Obj.delegate],
            fallback: (definition, { path }) => {
                throw new ParseError(
                    definition,
                    path,
                    `is of disallowed type ${typeof definition}.`
                )
            }
        },
        { matches: () => true }
    )
}
