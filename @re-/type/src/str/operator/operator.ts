import { Node, Operator, Parser } from "./common.js"
import { Bound, GroupClose, Intersection, List, Union } from "./nodes.js"

export const operator = (
    s: Operator.state,
    ctx: Node.context
): Parser.state => {
    const lookahead = s.r.shift()
    return lookahead === "END"
        ? s.suffixed("END")
        : lookahead === "?"
        ? s.suffixed("?")
        : lookahead === "["
        ? List.shiftReduce(s, ctx)
        : lookahead === "|"
        ? Union.reduce(s, ctx)
        : lookahead === "&"
        ? Intersection.reduce(s, ctx)
        : lookahead === ")"
        ? GroupClose.reduce(s)
        : Parser.Tokens.inTokenSet(lookahead, Bound.chars)
        ? Bound.parse(s, lookahead)
        : lookahead === " "
        ? operator(s, ctx)
        : Parser.state.error(unexpectedCharacterMessage(lookahead))
}

export type Operator<S extends Parser.State> =
    S["R"] extends Parser.Scanner.Shift<infer Lookahead, infer Unscanned>
        ? Lookahead extends "?"
            ? Parser.State.From<{
                  L: Parser.Left.SetNextSuffix<S["L"], "?">
                  R: Unscanned
              }>
            : Lookahead extends "["
            ? List.ShiftReduce<S, Unscanned>
            : Lookahead extends "|"
            ? Parser.State.From<{ L: Union.Reduce<S["L"]>; R: Unscanned }>
            : Lookahead extends "&"
            ? Parser.State.From<{
                  L: Intersection.Reduce<S["L"]>
                  R: Unscanned
              }>
            : Lookahead extends ")"
            ? Parser.State.From<{ L: GroupClose.Reduce<S["L"]>; R: Unscanned }>
            : Lookahead extends Bound.ComparatorChar
            ? Bound.Parse<S, Lookahead, Unscanned>
            : Lookahead extends " "
            ? Operator<{ L: S["L"]; R: Unscanned }>
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
