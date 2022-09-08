import { regexConstraint } from "../../nodes/constraints/regex.js"
import { stringNode } from "../../nodes/types/terminal/keywords/string.js"
import {
    StringLiteralDefinition,
    StringLiteralNode
} from "../../nodes/types/terminal/literals/string.js"
import { Left } from "../parser/left.js"
import { scanner } from "../parser/scanner.js"
import { ParserState, parserState } from "../parser/state.js"

export const enclosedBaseStartChars = scanner.tokens({
    "'": 1,
    '"': 1,
    "/": 1
})

export type EnclosedBaseStartChar = keyof typeof enclosedBaseStartChars

export const unterminatedEnclosedMessage = <
    Fragment extends string,
    Enclosing extends EnclosedBaseStartChar
>(
    fragment: Fragment,
    enclosing: Enclosing
): UnterminatedEnclosedMessage<Fragment, Enclosing> =>
    `${fragment} requires a closing ${enclosing}.`

type UnterminatedEnclosedMessage<
    Fragment extends string,
    Enclosing extends EnclosedBaseStartChar
> = `${Fragment} requires a closing ${Enclosing}.`

const untilLookaheadIsClosing: Record<
    EnclosedBaseStartChar,
    scanner.UntilCondition
> = {
    "'": (scanner) => scanner.lookahead === `'`,
    '"': (scanner) => scanner.lookahead === `"`,
    "/": (scanner) => scanner.lookahead === `/`
}

export const parseEnclosedBase = (
    s: parserState,
    enclosing: EnclosedBaseStartChar
) => {
    const enclosed = s.r.shiftUntil(untilLookaheadIsClosing[enclosing], {
        appendTo: enclosing,
        inclusive: true,
        onInputEnd: throwUnterminatedEnclosed
    })
    if (enclosing === "/") {
        s.l.root = new stringNode(
            new regexConstraint(
                enclosed,
                new RegExp(enclosed.slice(1, -1)),
                `match expression ${enclosed}`
            )
        )
    } else {
        s.l.root = new StringLiteralNode(enclosed as StringLiteralDefinition)
    }
    return s
}

export type ParseEnclosedBase<
    S extends ParserState,
    Enclosing extends EnclosedBaseStartChar
> = S["R"] extends `${Enclosing}${infer Contents}${Enclosing}${infer Rest}`
    ? ParserState.From<{
          L: Left.SetRoot<S["L"], `${Enclosing}${Contents}${Enclosing}`>
          R: Rest
      }>
    : ParserState.Error<UnterminatedEnclosedMessage<S["R"], Enclosing>>

const throwUnterminatedEnclosed: scanner.OnInputEndFn = (scanner, shifted) => {
    throw new Error(
        unterminatedEnclosedMessage(
            shifted,
            shifted[0] as EnclosedBaseStartChar
        )
    )
}
