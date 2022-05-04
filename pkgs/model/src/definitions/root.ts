import {
    typeDefProxy,
    Precedence,
    BadDefinitionType,
    DefinitionTypeError,
    definitionTypeError,
    UnknownTypeError,
    ErrorNode,
    DefaultParseTypeContext,
    ValueOf,
    ParseError
} from "./internal.js"
import { Obj, Map, Tuple } from "./obj/index.js"
import {
    ArrowFunction,
    Union,
    Intersection,
    Constraint,
    List,
    Str,
    Optional,
    Alias
} from "./str/index.js"
import { Literal } from "./literal/index.js"
import { reroot, createParser } from "./parser.js"
import { Evaluate, Get, ListPossibleTypes } from "@re-/tools"
import { ErrorNodeKind, ValidationErrorMessage } from "../errors.js"

export namespace Root {
    export type FastParse<Def, Resolutions, Ctx> = Def extends BadDefinitionType
        ? ParseError<DefinitionTypeError, Ctx>
        : Def extends string
        ? Str.FastParse<Def, Resolutions, Ctx>
        : Def extends RegExp
        ? string
        : Def extends object
        ? Obj.FastParse<Def, Resolutions, Ctx>
        : Def extends Literal.PrimitiveLiteral
        ? Def
        : ParseError<UnknownTypeError, Ctx>

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
