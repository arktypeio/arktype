import { Bound } from "./bound/index.js"
import {
    ReduceIntersection,
    reduceIntersection,
    ReduceUnion,
    reduceUnion
} from "./branches/index.js"
import { Node, Operator, Parser } from "./common.js"
import { ReduceGroupClose, reduceGroupClose } from "./groupClose.js"
import { ParseList, parseList } from "./list.js"

export const parseOperator = (
    s: Operator.state,
    ctx: Node.context
): Parser.state => {
    const lookahead = s.r.shift()
    return lookahead === "END"
        ? s.suffixed("END")
        : lookahead === "?"
        ? s.suffixed("?")
        : lookahead === "["
        ? parseList(s, ctx)
        : lookahead === "|"
        ? reduceUnion(s, ctx)
        : lookahead === "&"
        ? reduceIntersection(s, ctx)
        : lookahead === ")"
        ? reduceGroupClose(s)
        : Parser.inTokenSet(lookahead, Bound.comparatorChars)
        ? Bound.parse(s, lookahead)
        : lookahead === " "
        ? parseOperator(s, ctx)
        : s.error(unexpectedCharacterMessage(lookahead))
}

export type ParseOperator<S extends Parser.State> =
    S["R"] extends Parser.Scanner.Shift<infer Lookahead, infer Unscanned>
        ? Lookahead extends "?"
            ? Parser.State.From<{
                  L: Parser.Left.SetNextSuffix<S["L"], "?">
                  R: Unscanned
              }>
            : Lookahead extends "["
            ? ParseList<S, Unscanned>
            : Lookahead extends "|"
            ? Parser.State.From<{
                  L: ReduceUnion<S["L"]>
                  R: Unscanned
              }>
            : Lookahead extends "&"
            ? Parser.State.From<{
                  L: ReduceIntersection<S["L"]>
                  R: Unscanned
              }>
            : Lookahead extends ")"
            ? Parser.State.From<{
                  L: ReduceGroupClose<S["L"]>
                  R: Unscanned
              }>
            : Lookahead extends Bound.ComparatorChar
            ? Bound.Parse<S, Lookahead, Unscanned>
            : Lookahead extends " "
            ? ParseOperator<{ L: S["L"]; R: Unscanned }>
            : Parser.State.Error<UnexpectedCharacterMessage<Lookahead>>
        : Parser.State.From<{
              L: Parser.Left.SetNextSuffix<S["L"], "END">
              R: ""
          }>

const unexpectedCharacterMessage = <Char extends string>(
    char: Char
): UnexpectedCharacterMessage<Char> => `Unexpected character '${char}'.`

type UnexpectedCharacterMessage<Char extends string> =
    `Unexpected character '${Char}'.`
