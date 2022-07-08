import { Iteration, Split } from "@re-/tools"
import { Alias } from "./alias.js"
import { Base } from "./base.js"
import { Bound } from "./bound.js"
import { EmbeddedBigInt, EmbeddedNumber, EmbeddedRegex } from "./embedded.js"
import { Intersection } from "./intersection.js"
import { Keyword } from "./keyword/keyword.js"
import { List } from "./list.js"
import { Optional } from "./optional.js"
import { StringLiteral } from "./stringLiteral.js"
import { Union } from "./union.js"

type BinaryValidationResult<Left, Right> =
    Left extends Base.Parsing.ParseErrorMessage
        ? Left
        : Right extends Base.Parsing.ParseErrorMessage
        ? Right
        : Left

type BinaryValidate<
    Left extends string,
    Right extends string,
    Dict,
    Root
> = BinaryValidationResult<
    Str.Validate<Left, Dict, Root>,
    Str.Validate<Right, Dict, Root>
>

export namespace Str {
    export type Validate<Def extends string, Dict, Root> = Def extends
        | Keyword.Definition
        | keyof Dict
        | "cyclic"
        | "resolution"
        ? Root
        : Def extends Optional.Definition<infer Next>
        ? Optional.Validate<Next, Dict, Root>
        : Def extends  // eslint-disable-next-line @typescript-eslint/no-unused-vars
              | StringLiteral.Definition<infer Text>
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              | EmbeddedRegex.Definition<infer Expression>
              | EmbeddedNumber.Definition
              | EmbeddedBigInt.Definition
        ? Root
        : Def extends Intersection.Definition<infer Left, infer Right>
        ? BinaryValidate<Left, Right, Dict, Root>
        : Def extends Union.Definition<infer Left, infer Right>
        ? BinaryValidate<Left, Right, Dict, Root>
        : Def extends List.Definition<infer Next>
        ? Validate<Next, Dict, Root>
        : Def extends Bound.Definition
        ? Bound.Validate<Def, Dict, Root>
        : Base.Parsing.ParseErrorMessage<
              Base.Parsing.UnknownTypeErrorMessage<Def>
          >

    type BinaryValidationStackResult<Left, Right> =
        Left extends Base.Parsing.ParseErrorMessage
            ? Left
            : Right extends Base.Parsing.ParseErrorMessage
            ? Right
            : Left

    type BinaryValidateStack<
        Left extends string,
        Right extends string,
        Dict,
        Root
    > = BinaryValidationResult<
        Str.Validate<Left, Dict, Root>,
        Str.Validate<Right, Dict, Root>
    >

    export type References<Def extends string> =
        Def extends Base.Parsing.ParseErrorMessage
            ? []
            : Def extends  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  | StringLiteral.Definition<infer Text>
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  | EmbeddedRegex.Definition<infer Expression>
            ? [Def]
            : Def extends Optional.Definition<infer Next>
            ? References<Next>
            : Def extends Intersection.Definition<infer Left, infer Right>
            ? [...References<Left>, ...References<Right>]
            : Def extends Union.Definition<infer Left, infer Right>
            ? [...References<Left>, ...References<Right>]
            : Def extends List.Definition<infer Next>
            ? References<Next>
            : Def extends Bound.Definition
            ? Bound.References<Def>
            : [Def]

    type ListChars<
        S extends string,
        Result extends string[]
    > = S extends `${infer Char}${infer Rest}`
        ? ListChars<Rest, [...Result, Char]>
        : Result

    type Tokens = Lex<"", ListChars<"'yes|no'|'true|false'", []>, []>

    type Z = ParseTokens<Tokens, never, {}, {}>

    export type LexLiteral<
        Literal extends string,
        Chars extends string[],
        Stack extends string[],
        Enclosing extends string
    > = Chars extends Iteration<string, infer Char, infer Remaining>
        ? Char extends Enclosing
            ? Lex<
                  "",
                  Remaining,
                  [...Stack, `${Enclosing}${Literal}${Enclosing}`]
              >
            : LexLiteral<`${Literal}${Char}`, Remaining, Stack, Enclosing>
        : [...Stack, Literal]

    export type Lex<
        Fragment extends string,
        Chars extends string[],
        Stack extends string[]
    > = Chars extends Iteration<string, infer Char, infer Remaining>
        ? Fragment extends Keyword.Definition
            ? Lex<"", Remaining, [...Stack, Fragment]>
            : Char extends "'"
            ? LexLiteral<"", Remaining, Stack, "'">
            : Char extends "|" | "&"
            ? Lex<"", Remaining, [...Stack, Char]>
            : Lex<`${Fragment}${Char}`, Remaining, Stack>
        : Stack

    export type ParseTokens<
        Tokens extends string[],
        Type,
        Dict,
        Seen
    > = Tokens extends Iteration<string, infer Token, infer Remaining>
        ? Token extends "|"
            ? Type | ParseTokens<Remaining, never, Dict, Seen>
            : Token extends "&"
            ? Type & ParseTokens<Remaining, never, Dict, Seen>
            : Token extends Keyword.Definition
            ? ParseTokens<Remaining, Keyword.Types[Token], Dict, Seen>
            : Token extends `'${infer Value}'`
            ? ParseTokens<Remaining, Value, Dict, Seen>
            : unknown
        : Type

    export type Parse2<Def extends string, Dict, Seen> = ParseTokens<
        Lex<"", ListChars<Def, []>, []>,
        never,
        Dict,
        Seen
    >

    export type Parse<
        Def extends string,
        Dict,
        Seen
    > = Def extends Base.Parsing.ParseErrorMessage
        ? unknown
        : Def extends Keyword.Definition
        ? Keyword.Types[Def]
        : Def extends keyof Dict
        ? Alias.Parse<Def, Dict, Seen>
        : Def extends Optional.Definition<infer Next>
        ? Parse<Next, Dict, Seen> | undefined
        : Def extends StringLiteral.Definition<infer Text>
        ? Text
        : // eslint-disable-next-line @typescript-eslint/no-unused-vars
        Def extends EmbeddedRegex.Definition<infer Expression>
        ? string
        : Def extends EmbeddedNumber.Definition<infer Value extends number>
        ? Value
        : Def extends EmbeddedBigInt.Definition<infer Value extends bigint>
        ? Value
        : Def extends Intersection.Definition<infer Left, infer Right>
        ? Str.Parse<Left, Dict, Seen> & Str.Parse<Right, Dict, Seen>
        : Def extends Union.Definition<infer Left, infer Right>
        ? Str.Parse<Left, Dict, Seen> | Str.Parse<Right, Dict, Seen>
        : Def extends List.Definition<infer Next>
        ? Parse<Next, Dict, Seen>[]
        : Def extends Bound.Definition
        ? Bound.Parse<Def, Dict, Seen>
        : unknown

    export const matches = (def: unknown): def is string =>
        typeof def === "string"

    export const parse: Base.Parsing.Parser<string> = (def, ctx) => {
        if (Optional.matches(def)) {
            return new Optional.Node(def, ctx)
        } else if (Keyword.matches(def)) {
            return Keyword.parse(def, ctx)
        } else if (Alias.matches(def, ctx)) {
            return new Alias.Node(def, ctx)
        } else if (StringLiteral.matches(def)) {
            return new StringLiteral.Node(def, ctx)
        } else if (EmbeddedRegex.matches(def)) {
            return EmbeddedRegex.parse(def, ctx)
        } else if (EmbeddedNumber.matches(def)) {
            return EmbeddedNumber.parse(def, ctx)
        } else if (EmbeddedBigInt.matches(def)) {
            return EmbeddedBigInt.parse(def, ctx)
        } else if (Intersection.matches(def)) {
            return new Intersection.Node(def, ctx)
        } else if (Union.matches(def)) {
            return new Union.Node(def, ctx)
        } else if (List.matches(def)) {
            return new List.Node(def, ctx)
        } else if (Bound.matches(def)) {
            return new Bound.Node(def, ctx)
        }
        throw new Base.Parsing.ParseError(
            `Unable to determine the type of '${Base.defToString(
                def
            )}'${Base.stringifyPathContext(ctx.path)}.`
        )
    }
}
