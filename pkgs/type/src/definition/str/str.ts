import {
    ParseConfig,
    createParser,
    typeDefProxy,
    UnknownTypeError,
    ValidationErrorMessage
} from "./internal.js"
import { Alias } from "./alias"
import { Literal } from "./literal"
import { Expression } from "./expression"
import { Root } from "../root.js"
import { RemoveSpaces } from "@re-/utils"

export namespace Str {
    export type Definition = string

    export type Format<Def extends string> = RemoveSpaces<Def>

    export type FormatAndValidate<Def extends string, Typespace> = Str.Validate<
        Format<Def>,
        Def,
        Typespace
    >

    export type Validate<
        Def extends string,
        Root extends string,
        Typespace
    > = Def extends Literal.Definition
        ? Root
        : Def extends Alias.Definition<Typespace>
        ? Alias.Validate<Def, Root, Typespace>
        : Def extends Expression.Definition
        ? Expression.Validate<Def, Root, Typespace>
        : UnknownTypeError<Def>

    export type FormatAndParse<
        Def extends string,
        Typespace,
        Options extends ParseConfig
    > = Str.Parse<Format<Def>, Typespace, Options>

    export type Parse<
        Def extends string,
        Typespace,
        Options extends ParseConfig
    > = Str.Validate<Def, Def, Typespace> extends ValidationErrorMessage
        ? unknown
        : Def extends Literal.Definition
        ? Literal.Parse<Def>
        : Def extends Alias.Definition<Typespace>
        ? Alias.Parse<Def, Typespace, Options>
        : Def extends Expression.Definition
        ? Expression.Parse<Def, Typespace, Options>
        : unknown

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Root.parse,
            children: () => [
                Literal.delegate,
                Alias.delegate,
                Expression.delegate
            ]
        },
        {
            matches: (def) => typeof def === "string"
        }
    )

    export const delegate = parse as any as Definition
}
