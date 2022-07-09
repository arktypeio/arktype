import { Iteration } from "@re-/tools"
import { AliasIn } from "../../space.js"
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
        LexRoot<Def, Dict>
    >

    export type Parse<
        Def extends string,
        Dict,
        Seen
    > = Def extends Base.Parsing.ParseErrorMessage
        ? unknown
        : ParseTokens<LexRoot<Def, Dict>, never, Dict, Seen>
    // Def extends Optional.Definition<infer Next>
    // ? ParseFragment<Next, Dict, Seen> | undefined
    // :

    export type References<Def extends string, Dict> = TokensToReferences<
        LexRoot<Def, Dict>
    >

    type TokensToReferences<Tokens extends string[]> =
        Tokens extends ErrorToken<Base.Parsing.ParseErrorMessage>
            ? []
            : ExtractReferences<Tokens, []>

    type ExtractReferences<
        Tokens extends string[],
        Refs extends string[]
    > = Tokens extends Iteration<string, infer Token, infer Remaining>
        ? ExtractReferences<
              Remaining,
              Token extends SeparatorToken ? Refs : [...Refs, Token]
          >
        : Refs

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

    type LexRoot<Def extends string, Dict> = Lex<"", [], ToScannable<Def>, Dict>

    /** In this context, a Separator is any token that does not refer to a value */
    type SeparatorToken =
        | "[]"
        | "?"
        | "END"
        | "|"
        | "&"
        | "<"
        | ">"
        | "<="
        | ">="
        | "=="

    type Lex<
        Fragment extends string,
        Tokens extends string[],
        Unscanned extends string[],
        Dict
    > = Unscanned extends Iteration<string, infer NextChar, infer NextUnscanned>
        ? NextChar extends `[`
            ? LexList<Fragment, Tokens, NextUnscanned, Dict>
            : NextChar extends "?"
            ? NextUnscanned extends ["END"]
                ? LexSeparator<NextChar, Fragment, Tokens, NextUnscanned, Dict>
                : [
                      Base.Parsing.ParseErrorMessage<`Modifier '?' is only valid at the end of a type definition.`>
                  ]
            : NextChar extends "|" | "&" | "END"
            ? LexSeparator<NextChar, Fragment, Tokens, NextUnscanned, Dict>
            : NextChar extends `'` | `"` | `/`
            ? LexLiteral<NextChar, "", Tokens, NextUnscanned, Dict>
            : NextChar extends ">" | "<" | "="
            ? LexBound<NextChar, Fragment, Tokens, NextUnscanned, Dict>
            : Lex<`${Fragment}${NextChar}`, Tokens, NextUnscanned, Dict>
        : Tokens

    type BoundStartChar = "<" | ">" | "="

    type LexBound<
        FirstChar extends BoundStartChar,
        Fragment extends string,
        Tokens extends string[],
        Unscanned extends string[],
        Dict
    > = Unscanned extends [infer NextChar, ...infer NextUnscanned]
        ? NextChar extends "="
            ? LexSeparator<
                  `${FirstChar}=`,
                  Fragment,
                  Tokens,
                  // @ts-expect-error
                  NextUnscanned,
                  Dict
              >
            : FirstChar extends "="
            ? [
                  Base.Parsing.ParseErrorMessage<`= is not a valid comparator. Use == instead.`>
              ]
            : LexSeparator<
                  // @ts-expect-error
                  FirstChar,
                  Fragment,
                  Tokens,
                  // Use Unscanned here instead of NextUnscanned since the comparator was only 1 character
                  Unscanned,
                  Dict
              >
        : [
              Base.Parsing.ParseErrorMessage<`Expected a bound condition after ${FirstChar}.`>
          ]

    type LexSeparator<
        Separator extends SeparatorToken,
        Fragment extends string,
        Tokens extends string[],
        Unscanned extends string[],
        Dict
    > = Fragment extends
        | ""
        | Keyword.Definition
        | AliasIn<Dict>
        | EmbeddedNumber.Definition
        | EmbeddedBigInt.Definition
        ? Lex<"", PushTokensFrom<Separator, Fragment, Tokens>, Unscanned, Dict>
        : [
              Base.Parsing.ParseErrorMessage<
                  Base.Parsing.UnknownTypeErrorMessage<Fragment>
              >
          ]

    type PushTokensFrom<
        Separator extends SeparatorToken,
        Fragment extends string,
        Tokens extends string[]
    > = Separator extends "END"
        ? Fragment extends ""
            ? Tokens
            : [...Tokens, Fragment]
        : Fragment extends ""
        ? [...Tokens, Separator]
        : [...Tokens, Fragment, Separator]

    type ToScannable<Def extends string> = [...ListChars<Def, []>, "END"]

    type ListChars<
        S extends string,
        Result extends string[]
    > = S extends `${infer Char}${infer Rest}`
        ? ListChars<Rest, [...Result, Char]>
        : Result

    type LexList<
        Fragment extends string,
        Tokens extends string[],
        UnscannedChars extends string[],
        Dict
    > = UnscannedChars extends [infer NextChar, ...infer NextUnscanned]
        ? NextChar extends "]"
            ? LexSeparator<
                  "[]",
                  Fragment,
                  Tokens,
                  // @ts-expect-error TS can't infer that NextUnscanned is a string[]
                  NextUnscanned,
                  Dict
              >
            : [Base.Parsing.ParseErrorMessage<`Missing expected ']'.`>]
        : never

    type LexLiteral<
        Enclosing extends string,
        Literal extends string,
        Tokens extends string[],
        Unscanned extends string[],
        Dict
    > = Unscanned extends Iteration<string, infer NextChar, infer NextUnscanned>
        ? NextChar extends Enclosing
            ? Lex<
                  "",
                  [...Tokens, `${Enclosing}${Literal}${Enclosing}`],
                  NextUnscanned,
                  Dict
              >
            : LexLiteral<
                  Enclosing,
                  `${Literal}${NextChar}`,
                  Tokens,
                  NextUnscanned,
                  Dict
              >
        : [
              Base.Parsing.ParseErrorMessage<`Expected a closing ${Enclosing} token for literal expression ${Enclosing}${Literal}`>
          ]

    type ErrorToken<Message extends Base.Parsing.ParseErrorMessage> = [Message]

    type ValidateTokens<
        Def extends string,
        Tokens extends string[]
    > = Tokens extends ErrorToken<infer Message> ? Message : Def

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

    // type Z = Split<["number", "[]", "|", "string", "[]"], "|", [], []>

    // type Split<
    //     Tokens extends string[],
    //     Delimiter extends string,
    //     Groups extends string[][],
    //     CurrentGroup extends string[]
    // > = Tokens extends Iteration<string, infer Token, infer RemainingTokens>
    //     ? Token extends Delimiter
    //         ? Split<RemainingTokens, Delimiter, [...Groups, CurrentGroup], []>
    //         : Split<
    //               RemainingTokens,
    //               Delimiter,
    //               Groups,
    //               [...CurrentGroup, Token]
    //           >
    //     : [...Groups, CurrentGroup]

    // type UnionOf<
    //     TokenGroups extends string[][],
    //     Dict,
    //     Seen,
    //     Type
    // > = TokenGroups extends Iteration<
    //     string[],
    //     infer Group,
    //     infer RemainingGroups
    // >
    //     ? UnionOf<RemainingGroups, Dict, Seen, Type | PT2<Group, Dict, Seen>>
    //     : Type

    // type ParseUnion<Tokens extends string[], Dict, Seen> = UnionOf<
    //     Split<Tokens, "|", [], []>,
    //     Dict,
    //     Seen,
    //     never
    // >

    // type PT2<
    //     Tokens extends string[],
    //     Dict,
    //     Seen
    // > = "|" extends ElementOf<Tokens>
    //     ? ParseUnion<Tokens, Dict, Seen>
    //     : ParseGroup<Tokens, Dict, Seen>

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
        : Token extends EmbeddedNumber.Definition<infer Value>
        ? Value
        : Token extends EmbeddedBigInt.Definition<infer Value>
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
