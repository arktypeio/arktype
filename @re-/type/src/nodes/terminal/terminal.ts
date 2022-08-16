import { Base } from "../base/index.js"
import {
    BaseTerminatingChar,
    EnclosedBaseStartChar,
    Left,
    Scan,
    State
} from "../parser/index.js"
import { AliasNode, AliasType } from "./alias.js"
import { Keyword } from "./keyword/index.js"
import {
    BigintLiteralDefinition,
    BigintLiteralNode,
    InferLiteral,
    isRegexLiteralDefinition,
    isStringLiteralDefinition,
    NumberLiteralDefinition,
    NumberLiteralNode,
    RegexLiteralDefinition,
    regexLiteralToNode,
    StringLiteralDefinition,
    StringLiteralNode
} from "./literal/index.js"

export namespace Terminal {
    export type IsResolvableName<Token, Dict> = Token extends Keyword.Definition
        ? true
        : Token extends keyof Dict
        ? true
        : false

    export type IsResolvableUnenclosed<Token, Dict> = IsResolvableName<
        Token,
        Dict
    > extends true
        ? true
        : Token extends NumberLiteralDefinition | BigintLiteralDefinition
        ? true
        : false

    const unterminatedEnclosedMessage = <
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

    const untilConditionsByChar: Record<
        EnclosedBaseStartChar,
        State.UntilCondition
    > = {
        "'": (scanner) => scanner.lookahead === `'`,
        '"': (scanner) => scanner.lookahead === `"`,
        "/": (scanner) => scanner.lookahead === `/`
    }

    export const enclosedBase = (
        s: State.V,
        enclosing: EnclosedBaseStartChar
    ) => {
        const enclosed = s.r.shiftUntil(untilConditionsByChar[enclosing], {
            inclusive: true,
            onInputEnd: throwUnterminatedEnclosed,
            shiftTo: enclosing
        })
        if (enclosing === "/") {
            s.l.root = regexLiteralToNode(enclosed as RegexLiteralDefinition)
        } else {
            s.l.root = new StringLiteralNode(
                enclosed as StringLiteralDefinition
            )
        }
    }

    export type EnclosedBase<
        S extends State.T,
        Enclosing extends EnclosedBaseStartChar
    > = S["R"] extends `${Enclosing}${infer Contents}${Enclosing}${infer Rest}`
        ? State.From<{
              L: Left.SetRoot<S["L"], `${Enclosing}${Contents}${Enclosing}`>
              R: Rest
          }>
        : State.Error<UnterminatedEnclosedMessage<S["R"], Enclosing>>

    const throwUnterminatedEnclosed: State.OnInputEndFn = (
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

    export type UnenclosedBase<
        S extends State.T,
        Fragment extends string,
        Unscanned extends string,
        Dict
    > = Unscanned extends Scan<infer Next, infer Rest>
        ? Next extends BaseTerminatingChar
            ? ValidateUnenclosed<S, Fragment, Unscanned, Dict>
            : UnenclosedBase<S, `${Fragment}${Next}`, Rest, Dict>
        : ValidateUnenclosed<S, Fragment, "", Dict>

    type ValidateUnenclosed<
        S extends State.T,
        Fragment extends string,
        Unscanned extends string,
        Dict
    > = Terminal.IsResolvableUnenclosed<Fragment, Dict> extends true
        ? State.From<{ L: Left.SetRoot<S["L"], Fragment>; R: Unscanned }>
        : State.Error<`'${Fragment}' is not a builtin type and does not exist in your space.`>
}

export type InferTerminalStr<
    Token extends string,
    Ctx extends Base.Parsing.InferenceContext
> = Token extends Keyword.Definition
    ? Keyword.Types[Token]
    : Token extends keyof Ctx["dict"]
    ? AliasType.Infer<Token, Ctx>
    : InferLiteral<Token>
