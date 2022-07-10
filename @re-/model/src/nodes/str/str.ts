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
    export type Validate<Def extends string, Dict> = ValidateParseTree<
        Def,
        Parse<Def, Dict>
    >

    export type TypeOf<
        Def extends string,
        Dict
    > = Def extends Base.Parsing.ParseErrorMessage
        ? unknown
        : TypeOfParseTree<Parse<Def, Dict>>

    export type Parse<Def extends string, Dict> = ParseExpression<
        LexRoot<Def>,
        [],
        Dict
    >

    export type References<Def extends string> = TokensToReferences<
        LexRoot<Def>
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

    type LexRoot<Def extends string> = Lex<"", [], ToScannable<Def>>

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
        | "("
        | ")"

    type Lex<
        Fragment extends string,
        Tokens extends string[],
        Unscanned extends string[]
    > = Unscanned extends Iteration<string, infer NextChar, infer NextUnscanned>
        ? NextChar extends `[`
            ? LexList<Fragment, Tokens, NextUnscanned>
            : NextChar extends "?"
            ? NextUnscanned extends ["END"]
                ? LexSeparator<NextChar, Fragment, Tokens, NextUnscanned>
                : [
                      Base.Parsing.ParseErrorMessage<`Modifier '?' is only valid at the end of a type definition.`>
                  ]
            : NextChar extends "|" | "&" | "END" | "(" | ")"
            ? LexSeparator<NextChar, Fragment, Tokens, NextUnscanned>
            : NextChar extends `'` | `"` | `/`
            ? LexLiteral<NextChar, "", Tokens, NextUnscanned>
            : NextChar extends ">" | "<" | "="
            ? LexBound<NextChar, Fragment, Tokens, NextUnscanned>
            : Lex<`${Fragment}${NextChar}`, Tokens, NextUnscanned>
        : Tokens

    type BoundStartChar = "<" | ">" | "="

    type LexBound<
        FirstChar extends BoundStartChar,
        Fragment extends string,
        Tokens extends string[],
        Unscanned extends string[]
    > = Unscanned extends [infer NextChar, ...infer NextUnscanned]
        ? NextChar extends "="
            ? LexSeparator<
                  `${FirstChar}=`,
                  Fragment,
                  Tokens,
                  // @ts-expect-error
                  NextUnscanned
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
                  Unscanned
              >
        : [
              Base.Parsing.ParseErrorMessage<`Expected a bound condition after ${FirstChar}.`>
          ]

    type LexSeparator<
        Separator extends SeparatorToken,
        Fragment extends string,
        Tokens extends string[],
        Unscanned extends string[]
    > = Lex<"", PushTokensFrom<Separator, Fragment, Tokens>, Unscanned>

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
        UnscannedChars extends string[]
    > = UnscannedChars extends [infer NextChar, ...infer NextUnscanned]
        ? NextChar extends "]"
            ? LexSeparator<
                  "[]",
                  Fragment,
                  Tokens,
                  // @ts-expect-error TS can't infer that NextUnscanned is a string[]
                  NextUnscanned
              >
            : [Base.Parsing.ParseErrorMessage<`Missing expected ']'.`>]
        : never

    type LexLiteral<
        Enclosing extends string,
        Literal extends string,
        Tokens extends string[],
        Unscanned extends string[]
    > = Unscanned extends Iteration<string, infer NextChar, infer NextUnscanned>
        ? NextChar extends Enclosing
            ? Lex<
                  "",
                  [...Tokens, `${Enclosing}${Literal}${Enclosing}`],
                  NextUnscanned
              >
            : LexLiteral<
                  Enclosing,
                  `${Literal}${NextChar}`,
                  Tokens,
                  NextUnscanned
              >
        : [
              Base.Parsing.ParseErrorMessage<`Expected a closing ${Enclosing} token for literal expression ${Enclosing}${Literal}`>
          ]

    type ErrorToken<Message extends Base.Parsing.ParseErrorMessage> = [Message]

    //"((number||string)[]|boolean)[]"
    type T = LexRoot<"((number|string[])|boolean)[]">
    type ZZZ = ParseExpression<T, [], {}>

    type TypeOfParseTree<Tree> = Tree extends TerminalNode<string, infer Type>
        ? Type
        : Tree extends [infer Next, "[]"]
        ? TypeOfParseTree<Next>[]
        : Tree extends [infer Left, "|", infer Right]
        ? TypeOfParseTree<Left> | TypeOfParseTree<Right>
        : unknown

    type ValidateParseTree<
        RootDef extends string,
        Tree
    > = Tree extends ErrorNode<infer Message>
        ? Message
        : Tree extends TerminalNode<string, unknown>
        ? RootDef
        : Tree extends Iteration<unknown, infer Branch, infer Remaining>
        ? ValidateParseTree<RootDef, Branch> extends string
            ? ValidateParseTree<RootDef, Branch>
            : ValidateParseTree<RootDef, Remaining>
        : RootDef

    type ParseExpression<
        Tokens extends string[],
        Tree,
        Dict
    > = Tokens extends Iteration<string, infer Token, infer Remaining>
        ? Token extends "("
            ? ParseGroup<SplitByMatchingParen<Remaining, [], []>, Tree, Dict>
            : Token extends ")"
            ? ErrorNode<"Unexpected ).">
            : ParseOperator<Remaining, PushTerminal<Tree, Token, Dict>, Dict>
        : Tree

    type ParseOperator<
        Tokens extends string[],
        Tree,
        Dict
    > = Tokens extends Iteration<string, infer Token, infer Remaining>
        ? Token extends "[]"
            ? ParseOperator<Remaining, [Tree, "[]"], Dict>
            : Token extends "|"
            ? [Tree, "|", ParseExpression<Remaining, [], Dict>]
            : ErrorNode<`Expected an operator (got ${Token}).`>
        : Tree

    type ParseGroup<Sliced, Tree, Dict> = Sliced extends [
        infer Group,
        infer Remaining
    ]
        ? ParseOperator<
              // @ts-expect-error
              Remaining,
              // @ts-expect-error
              PushExpression<Tree, ParseExpression<Group, [], Dict>>,
              Dict
          >
        : Sliced

    type PushExpression<Tree, Expression> = Tree extends []
        ? Expression
        : [Tree, Expression]

    type PushTerminal<Tree, Token extends string, Dict> = PushExpression<
        Tree,
        ParseTerminal<Token, Dict>
    >

    type SplitByMatchingParen<
        Tokens extends string[],
        BeforeMatch extends string[],
        Depth extends unknown[]
    > = Tokens extends Iteration<string, infer Token, infer Remaining>
        ? Token extends "("
            ? SplitByMatchingParen<
                  Remaining,
                  [...BeforeMatch, Token],
                  [...Depth, 1]
              >
            : Token extends ")"
            ? Depth extends [...infer DepthMinusOne, infer Pop]
                ? SplitByMatchingParen<
                      Remaining,
                      [...BeforeMatch, Token],
                      DepthMinusOne
                  >
                : [BeforeMatch, Remaining]
            : SplitByMatchingParen<Remaining, [...BeforeMatch, Token], Depth>
        : ["Missing )."]

    type TerminalNode<Def extends string, Type> = [Def, Type]

    type ErrorNode<Message extends string> = [Message]

    type ParseTerminal<Token extends string, Dict> = TypeOfTerminal<
        Token,
        Dict
    > extends Base.Parsing.ParseErrorMessage
        ? ErrorNode<TypeOfTerminal<Token, Dict>>
        : TerminalNode<Token, TypeOfTerminal<Token, Dict>>

    type TypeOfTerminal<
        Token extends string,
        Dict
    > = Token extends Keyword.Definition
        ? Keyword.Types[Token]
        : Token extends keyof Dict
        ? Alias.Parse<Token, Dict, {}>
        : Token extends `'${infer Value}'`
        ? Value
        : Token extends `/${string}/`
        ? string
        : Token extends EmbeddedNumber.Definition<infer Value>
        ? Value
        : Token extends EmbeddedBigInt.Definition<infer Value>
        ? Value
        : Base.Parsing.ParseErrorMessage<
              Base.Parsing.UnknownTypeErrorMessage<Token>
          >

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
