import {
    typeDefProxy,
    DefinitionTypeError,
    definitionTypeError,
    UnknownTypeError,
    ParseError
} from "./internal.js"
import { Obj } from "./obj/index.js"
import { Literal } from "./literal/index.js"
import { reroot, createParser } from "./parser.js"
import { Str } from "./str/index.js"
import { IsAnyOrUnknown } from "@re-/tools"

export namespace Root {
    export type FastParse<Def, Dict, Seen> = IsAnyOrUnknown<Def> extends true
        ? Def
        : Def extends BadDefinitionType
        ? ParseError<DefinitionTypeError>
        : Def extends string
        ? Str.FastParse<Def, Dict, Seen>
        : Def extends RegExp
        ? string
        : Def extends object
        ? Obj.FastParse<Def, Dict, Seen>
        : Def extends Literal.PrimitiveLiteral
        ? Def
        : ParseError<UnknownTypeError>

    export type FastValidate<Def, Dict> = Def extends []
        ? Def
        : Def extends BadDefinitionType
        ? ParseError<DefinitionTypeError>
        : Def extends string
        ? Str.FastValidate<Def, Dict, Def>
        : Def extends Literal.Definition
        ? Def
        : Def extends object
        ? { [K in keyof Def]: FastValidate<Def[K], Dict> }
        : ParseError<UnknownTypeError>

    export type BadDefinitionType = Function | symbol

    export const type = typeDefProxy

    export const parser = createParser(
        {
            type,
            parent: () => reroot,
            children: () => [Literal.delegate, Str.delegate, Obj.delegate],
            fallback: (definition, { path }) => {
                throw new Error(definitionTypeError(definition, path))
            }
        },
        { matches: () => true }
    )
}
