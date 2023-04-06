import type { Node } from "../../../../nodes/node.js"
import type {
    autocomplete,
    error,
    stringKeyOf
} from "../../../../utils/generics.ts"
import type {
    BigintLiteral,
    NumberLiteral
} from "../../../../utils/numericLiterals.ts"
import {
    tryParseWellFormedBigint,
    tryParseWellFormedNumber
} from "../../../../utils/numericLiterals.ts"
import type { DynamicState } from "../../reduce/dynamic.js"
import type { state, StaticState } from "../../reduce/static.js"
import type { Scanner } from "../scanner.js"

export const parseUnenclosed = (s: DynamicState) => {
    const token = s.scanner.shiftUntilNextTerminator()
    s.setRoot(unenclosedToNode(s, token))
}

export type parseUnenclosed<
    s extends StaticState,
    $
> = Scanner.shiftUntilNextTerminator<
    s["unscanned"]
> extends Scanner.shiftResult<infer scanned, infer nextUnscanned>
    ? tryResolve<s, scanned, $> extends infer result
        ? result extends error<infer message>
            ? error<message>
            : state.setRoot<s, result, nextUnscanned>
        : never
    : never

const unenclosedToNode = (s: DynamicState, token: string) => {
    if (s.ctx.type.scope.addParsedReferenceIfResolvable(token, s.ctx)) {
        return token
    }
    return (
        maybeParseUnenclosedLiteral(token) ??
        s.error(
            token === ""
                ? writeMissingOperandMessage(s)
                : writeUnresolvableMessage(token)
        )
    )
}

const maybeParseUnenclosedLiteral = (token: string): Node | undefined => {
    const maybeNumber = tryParseWellFormedNumber(token)
    if (maybeNumber !== undefined) {
        return { number: { value: maybeNumber } }
    }
    const maybeBigint = tryParseWellFormedBigint(token)
    if (maybeBigint !== undefined) {
        return {
            bigint: {
                value: maybeBigint
            }
        }
    }
}

type tryResolve<
    s extends StaticState,
    token extends string,
    $
> = token extends keyof $
    ? token
    : token extends NumberLiteral
    ? token
    : // These checks are temporarily disabled because we're unable to update our TS version in StackBlitz to 4.8+
    // https://github.com/arktypeio/arktype/issues/659
    // number extends value
    //     ? error<writeMalformedNumericLiteralMessage<token, "number">>
    //     : token
    token extends BigintLiteral
    ? token
    : // bigint extends value
      //     ? error<writeMalformedNumericLiteralMessage<token, "bigint">>
      //     : token
      possibleCompletions<s, token, $>

export type possibleCompletions<
    s extends StaticState,
    token extends string,
    $
> = error<
    {
        [alias in keyof $]: alias extends `${token}${infer rest}`
            ? `${s["scanned"]}${token}${rest}`
            : never
    }[keyof $]
>

export const writeUnresolvableMessage = <token extends string>(
    token: token
): writeUnresolvableMessage<token> => `'${token}' is unresolvable`

type writeUnresolvableMessage<token extends string> =
    `'${token}' is unresolvable`

export const writeMissingOperandMessage = <s extends DynamicState>(s: s) => {
    const operator = s.previousOperator()
    return operator
        ? writeMissingRightOperandMessage(operator, s.scanner.unscanned)
        : writeExpressionExpectedMessage(s.scanner.unscanned)
}

export type writeMissingOperandMessage<
    s extends StaticState,
    operator extends Scanner.InfixToken | undefined = state.previousOperator<s>
> = operator extends {}
    ? writeMissingRightOperandMessage<operator, s["unscanned"]>
    : writeExpressionExpectedMessage<s["unscanned"]>

export type writeMissingRightOperandMessage<
    token extends Scanner.InfixToken,
    unscanned extends string
> = `Token '${token}' requires a right operand${unscanned extends ""
    ? ""
    : ` before '${unscanned}'`}`

export const writeMissingRightOperandMessage = <
    token extends Scanner.InfixToken,
    unscanned extends string
>(
    token: token,
    unscanned: unscanned
): writeMissingRightOperandMessage<token, unscanned> =>
    `Token '${token}' requires a right operand${
        unscanned ? (` before '${unscanned}'` as any) : ""
    }`

export const writeExpressionExpectedMessage = <unscanned extends string>(
    unscanned: unscanned
) => `Expected an expression${unscanned ? ` before '${unscanned}'` : ""}`

export type writeExpressionExpectedMessage<unscanned extends string> =
    `Expected an expression${unscanned extends ""
        ? ""
        : ` before '${unscanned}'`}`
