import { isKeyOf } from "../../utils/generics.js"
import { throwInternalError } from "../../utils/internalArktypeError.js"
import { Scanner } from "../state/scanner.js"
import { State } from "../state/state.js"
import { Arr } from "./array.js"
import { Bounds } from "./bounds/bound.js"
import { Divisor } from "./divisor.js"
import { GroupClose } from "./groupClose.js"
import { Intersection } from "./intersection.js"
import { Union } from "./union.js"

export namespace Operator {
    export const parse = (s: State.DynamicWithRoot): State.Dynamic => {
        const lookahead = s.scanner.shift()
        return lookahead === ""
            ? State.finalize(s)
            : lookahead === "["
            ? Arr.parse(s)
            : lookahead === "|"
            ? Union.parse(s)
            : lookahead === "&"
            ? Intersection.parse(s)
            : lookahead === ")"
            ? GroupClose.parse(s)
            : isKeyOf(lookahead, Scanner.comparatorStartChars)
            ? Bounds.parse(s, lookahead)
            : lookahead === "%"
            ? Divisor.parse(s)
            : lookahead === " "
            ? parse(s)
            : throwInternalError(buildUnexpectedCharacterMessage(lookahead))
    }

    export type parse<s extends State.StaticWithRoot> =
        s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned>
            ? lookahead extends "["
                ? Arr.parse<s, unscanned>
                : lookahead extends "|"
                ? Union.parse<State.scanTo<s, unscanned>>
                : lookahead extends "&"
                ? Intersection.parse<State.scanTo<s, unscanned>>
                : lookahead extends ")"
                ? GroupClose.parse<State.scanTo<s, unscanned>>
                : lookahead extends Scanner.ComparatorStartChar
                ? Bounds.parse<s, lookahead, unscanned>
                : lookahead extends "%"
                ? Divisor.parse<s, unscanned>
                : lookahead extends " "
                ? parse<State.scanTo<s, unscanned>>
                : State.error<buildUnexpectedCharacterMessage<lookahead>>
            : State.finalize<s, 0>

    export const buildUnexpectedCharacterMessage = <char extends string>(
        char: char
    ): buildUnexpectedCharacterMessage<char> => `Unexpected character '${char}'`

    type buildUnexpectedCharacterMessage<char extends string> =
        `Unexpected character '${char}'`
}
