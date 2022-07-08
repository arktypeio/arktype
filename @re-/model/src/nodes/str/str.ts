import { Iteration } from "@re-/tools"
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

export namespace Str {
    export type Validate<Def extends string, Dict> = ValidateTokens<
        Def,
        Lex<"", ListChars<Def, []>, [], Dict>
    >

    export type Parse<
        Def extends string,
        Dict,
        Seen
    > = Def extends Base.Parsing.ParseErrorMessage
        ? unknown
        : ParseFragment<Def, Dict, Seen>
    // Def extends Optional.Definition<infer Next>
    // ? ParseFragment<Next, Dict, Seen> | undefined
    // :

    export type References<Def extends string> = []
    // Def extends Base.Parsing.ParseErrorMessage
    //     ? []
    //     : Def extends  // eslint-disable-next-line @typescript-eslint/no-unused-vars
    //           | StringLiteral.Definition<infer Text>
    //           // eslint-disable-next-line @typescript-eslint/no-unused-vars
    //           | EmbeddedRegex.Definition<infer Expression>
    //     ? [Def]
    //     : Def extends Optional.Definition<infer Next>
    //     ? References<Next>
    //     : Def extends Intersection.Definition<infer Left, infer Right>
    //     ? [...References<Left>, ...References<Right>]
    //     : Def extends Union.Definition<infer Left, infer Right>
    //     ? [...References<Left>, ...References<Right>]
    //     : Def extends List.Definition<infer Next>
    //     ? References<Next>
    //     : Def extends Bound.Definition
    //     ? Bound.References<Def>
    //     : [Def]

    type Lex<
        Fragment extends string,
        Chars extends string[],
        Tokens extends string[],
        Dict,
        IsReference extends boolean = false
    > = Chars extends Iteration<string, infer Char, infer Remaining>
        ? Char extends "["
            ? LexList<Remaining, AddPossibleReference<Tokens, Fragment>, Dict>
            : Char extends "|" | "&"
            ? Lex<"", Remaining, [...Tokens, Fragment, Char], Dict>
            : Char extends `'` | `"` | `/`
            ? LexLiteral<"", Remaining, Tokens, Dict, Char>
            : Lex<`${Fragment}${Char}`, Remaining, Tokens, Dict, true>
        : AddPossibleReference<Tokens, Fragment>

    type ListChars<
        S extends string,
        Result extends string[]
    > = S extends `${infer Char}${infer Rest}`
        ? ListChars<Rest, [...Result, Char]>
        : Result

    type LexLiteral<
        Literal extends string,
        Chars extends string[],
        Stack extends string[],
        Dict,
        Enclosing extends string
    > = Chars extends Iteration<string, infer Char, infer Remaining>
        ? Char extends Enclosing
            ? Lex<`${Enclosing}${Literal}${Enclosing}`, Remaining, Stack, Dict>
            : LexLiteral<`${Literal}${Char}`, Remaining, Stack, Dict, Enclosing>
        : [
              ...Stack,
              Base.Parsing.ParseErrorMessage<`Expected a closing (${Enclosing}) token for literal expression ${Enclosing}${Literal}`>
          ]

    type LexList<
        Chars extends string[],
        Tokens extends string[],
        Dict
    > = Chars extends [infer First, ...infer Remaining]
        ? Lex<
              "",
              // @ts-expect-error TS can't infer that Remaining is a string[]?
              Remaining,
              [
                  ...Tokens,
                  First extends "]"
                      ? "[]"
                      : Base.Parsing.ParseErrorMessage<`Missing expected ']'.`>
              ],
              Dict
          >
        : never

    type AddPossibleReference<
        Tokens extends string[],
        Fragment extends string
    > = Fragment extends "" ? Tokens : [...Tokens, Fragment]

    type ValidateTokens<
        Def extends string,
        Tokens extends string[]
    > = Tokens extends Iteration<string, infer Token, infer Remaining>
        ? Token extends Base.Parsing.ParseErrorMessage
            ? Token
            : ValidateTokens<Def, Remaining>
        : Def

    type ParseFragment<Def extends string, Dict, Seen> = ParseTokens<
        Lex<"", ListChars<Def, []>, [], Dict>,
        never,
        Dict,
        Seen
    >

    type ParseTokens<
        Tokens extends string[],
        Type,
        Dict,
        Seen
    > = Tokens extends Iteration<string, infer Token, infer Remaining>
        ? Token extends "|"
            ? Type | ParseTokens<Remaining, never, Dict, Seen>
            : Token extends "&"
            ? Type & ParseTokens<Remaining, never, Dict, Seen>
            : Token extends "[]"
            ? ParseTokens<Remaining, Type[], Dict, Seen>
            : ParseTokens<
                  Remaining,
                  ParseReference<Token, Dict, Seen>,
                  Dict,
                  Seen
              >
        : Type

    type ParseReference<
        Token extends string,
        Dict,
        Seen
    > = Token extends Keyword.Definition
        ? Keyword.Types[Token]
        : Token extends keyof Dict
        ? Alias.Parse<Token, Dict, Seen>
        : Token extends `'${infer Value}'`
        ? Value
        : Token extends `/${string}/`
        ? string
        : Token extends EmbeddedNumber.Definition<infer Value extends number>
        ? Value
        : Token extends EmbeddedBigInt.Definition<infer Value extends bigint>
        ? Value
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
