import { Parser } from "../common.js"
import { RegexLiteralDefinition, RegexLiteralNode } from "./regexLiteral.js"
import { StringLiteralDefinition, StringLiteralNode } from "./stringLiteral.js"

export const enclosedBaseStartChars = Parser.tokenSet({
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
    Parser.scanner.UntilCondition
> = {
    "'": (scanner) => scanner.lookahead === `'`,
    '"': (scanner) => scanner.lookahead === `"`,
    "/": (scanner) => scanner.lookahead === `/`
}

export const parseEnclosedBase = (
    s: Parser.state,
    enclosing: EnclosedBaseStartChar
) => {
    const enclosed = s.r.shiftUntil(untilLookaheadIsClosing[enclosing], {
        appendTo: enclosing,
        inclusive: true,
        onInputEnd: throwUnterminatedEnclosed
    })
    if (enclosing === "/") {
        s.l.root = new RegexLiteralNode(enclosed as RegexLiteralDefinition)
    } else {
        s.l.root = new StringLiteralNode(enclosed as StringLiteralDefinition)
    }
    return s
}

export type ParseEnclosedBase<
    S extends Parser.State,
    Enclosing extends EnclosedBaseStartChar
> = S["R"] extends `${Enclosing}${infer Contents}${Enclosing}${infer Rest}`
    ? Parser.State.From<{
          L: Parser.Left.SetRoot<S["L"], `${Enclosing}${Contents}${Enclosing}`>
          R: Rest
      }>
    : Parser.State.Error<UnterminatedEnclosedMessage<S["R"], Enclosing>>

const throwUnterminatedEnclosed: Parser.scanner.OnInputEndFn = (
    scanner,
    shifted
) => {
    throw new Error(
        unterminatedEnclosedMessage(
            shifted,
            shifted[0] as EnclosedBaseStartChar
        )
    )
}
