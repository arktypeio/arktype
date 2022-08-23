import { Node } from "../common.js"
import { left, Left, Scanner, state, State, Tokens } from "../parser/index.js"
import { Bound, GroupClose, Intersection, List, Union } from "./nodes.js"

export const operator = (s: state<left.withRoot>, ctx: Node.Context): state => {
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
        : Tokens.inTokenSet(lookahead, Bound.chars)
        ? Bound.parse(s, lookahead)
        : lookahead === " "
        ? operator(s, ctx)
        : state.error(unexpectedCharacterMessage(lookahead))
}

export type Operator<S extends State> = S["R"] extends Scanner.Shift<
    infer Lookahead,
    infer Unscanned
>
    ? Lookahead extends "?"
        ? State.From<{ L: Left.SetNextSuffix<S["L"], "?">; R: Unscanned }>
        : Lookahead extends "["
        ? List.ShiftReduce<S, Unscanned>
        : Lookahead extends "|"
        ? State.From<{ L: Union.Reduce<S["L"]>; R: Unscanned }>
        : Lookahead extends "&"
        ? State.From<{ L: Intersection.Reduce<S["L"]>; R: Unscanned }>
        : Lookahead extends ")"
        ? State.From<{ L: GroupClose.Reduce<S["L"]>; R: Unscanned }>
        : Lookahead extends Bound.ComparatorChar
        ? Bound.Parse<S, Lookahead, Unscanned>
        : Lookahead extends " "
        ? Operator<{ L: S["L"]; R: Unscanned }>
        : State.Error<UnexpectedCharacterMessage<Lookahead>>
    : State.From<{ L: Left.SetNextSuffix<S["L"], "END">; R: "" }>

const unexpectedCharacterMessage = <Char extends string>(
    char: Char
): UnexpectedCharacterMessage<Char> => `Unexpected character '${char}'.`

type UnexpectedCharacterMessage<Char extends string> =
    `Unexpected character '${Char}'.`
