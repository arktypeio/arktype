import { Base } from "../../nodes/base.js"
import { Left } from "../parser/left.js"
import { scanner, Scanner } from "../parser/scanner.js"
import { parserState, ParserState } from "../parser/state.js"
import { Bound } from "./bound/index.js"
import {
    ReduceIntersection,
    reduceIntersection,
    ReduceUnion,
    reduceUnion
} from "./branch/index.js"
import { ReduceGroupClose, reduceGroupClose } from "./groupClose.js"
import { ParseList, parseList } from "./list.js"

export const parseOperator = (
    s: parserState.withRoot,
    ctx: Base.context
): parserState => {
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
        : scanner.inTokenSet(lookahead, Bound.comparatorChars)
        ? Bound.parse(s, lookahead)
        : lookahead === " "
        ? parseOperator(s, ctx)
        : s.error(unexpectedCharacterMessage(lookahead))
}

export type ParseOperator<S extends ParserState> = S["R"] extends Scanner.Shift<
    infer Lookahead,
    infer Unscanned
>
    ? Lookahead extends "?"
        ? ParserState.From<{
              L: Left.SetNextSuffix<S["L"], "?">
              R: Unscanned
          }>
        : Lookahead extends "["
        ? ParseList<S, Unscanned>
        : Lookahead extends "|"
        ? ParserState.From<{
              L: ReduceUnion<S["L"]>
              R: Unscanned
          }>
        : Lookahead extends "&"
        ? ParserState.From<{
              L: ReduceIntersection<S["L"]>
              R: Unscanned
          }>
        : Lookahead extends ")"
        ? ParserState.From<{
              L: ReduceGroupClose<S["L"]>
              R: Unscanned
          }>
        : Lookahead extends Bound.ComparatorChar
        ? Bound.Parse<S, Lookahead, Unscanned>
        : Lookahead extends " "
        ? ParseOperator<{ L: S["L"]; R: Unscanned }>
        : ParserState.Error<UnexpectedCharacterMessage<Lookahead>>
    : ParserState.From<{
          L: Left.SetNextSuffix<S["L"], "END">
          R: ""
      }>

const unexpectedCharacterMessage = <Char extends string>(
    char: Char
): UnexpectedCharacterMessage<Char> => `Unexpected character '${char}'.`

type UnexpectedCharacterMessage<Char extends string> =
    `Unexpected character '${Char}'.`
