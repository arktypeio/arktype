import type { DynamicScope } from "../../../scope.js"
import type { error, is } from "../../../utils/generics.js"
import type {
    BigintLiteral,
    buildMalformedNumericLiteralMessage,
    NumberLiteral
} from "../../../utils/numericLiterals.js"
import {
    tryParseWellFormedBigint,
    tryParseWellFormedNumber
} from "../../../utils/numericLiterals.js"
import { parseRoot } from "../../parse.js"
import type { DynamicState } from "../../reduce/dynamic.js"
import type { Scanner } from "../../reduce/scanner.js"
import type { state, StaticState } from "../../reduce/static.js"
import { Keyword } from "./keyword.js"

export const parseUnenclosed = (s: DynamicState) => {
    const token = s.scanner.shiftUntilNextTerminator()
    s.setRoot(unenclosedToAttributes(s, token))
}

export type parseUnenclosed<
    s extends StaticState,
    alias extends string
> = Scanner.shiftUntilNextTerminator<
    s["unscanned"]
> extends Scanner.shiftResult<infer scanned, infer nextUnscanned>
    ? tryResolve<s, scanned, alias> extends is<infer result>
        ? result extends error<infer message>
            ? state.throws<message>
            : state.setRoot<s, result, nextUnscanned>
        : never
    : never

const unenclosedToAttributes = (s: DynamicState, token: string) =>
    maybeParseIdentifier(token, s.scope) ??
    maybeParseUnenclosedLiteral(token) ??
    s.error(
        token === ""
            ? buildMissingOperandMessage(s)
            : buildUnresolvableMessage(token)
    )

export const maybeParseIdentifier = (token: string, scope: DynamicScope) =>
    Keyword.matches(token)
        ? Keyword.attributes[token]()
        : scope.$.aliases[token]
        ? parseAlias(token, scope)
        : scope.$.config.scope?.$.attributes[token]

const parseAlias = (name: string, scope: DynamicScope) => {
    const cache = scope.$.parseCache
    const cachedAttributes = cache.get(name)
    if (!cachedAttributes) {
        // Set the resolution to a shallow reference until the alias has
        // been fully parsed in case it cyclicly references itself
        cache.set(name, { alias: name })
        cache.set(name, parseRoot(scope.$.aliases[name], scope))
    }
    return cache.get(name)
}

const maybeParseUnenclosedLiteral = (token: string) => {
    const maybeNumber = tryParseWellFormedNumber(token)
    if (maybeNumber !== undefined) {
        return { value: token as NumberLiteral }
    }
    const maybeBigint = tryParseWellFormedBigint(token)
    if (maybeBigint !== undefined) {
        return { value: token as BigintLiteral }
    }
}

export type isResolvableIdentifier<
    token,
    alias extends string
> = token extends Keyword ? true : token extends alias ? true : false

type tryResolve<
    s extends StaticState,
    token extends string,
    alias extends string
> = isResolvableIdentifier<token, alias> extends true
    ? token
    : token extends NumberLiteral<infer value>
    ? number extends value
        ? error<buildMalformedNumericLiteralMessage<token, "number">>
        : value
    : token extends BigintLiteral<infer value>
    ? bigint extends value
        ? error<buildMalformedNumericLiteralMessage<token, "bigint">>
        : value
    : error<
          token extends ""
              ? buildMissingOperandMessage<s>
              : buildUnresolvableMessage<token>
      >

export const buildUnresolvableMessage = <token extends string>(
    token: token
): buildUnresolvableMessage<token> => `'${token}' is unresolvable`

type buildUnresolvableMessage<token extends string> =
    `'${token}' is unresolvable`

export const buildMissingOperandMessage = <s extends DynamicState>(s: s) => {
    const operator = s.previousOperator()
    return operator
        ? buildMissingRightOperandMessage(operator, s.scanner.unscanned)
        : buildExpressionExpectedMessage(s.scanner.unscanned)
}

export type buildMissingOperandMessage<
    s extends StaticState,
    operator extends Scanner.InfixToken | undefined = state.previousOperator<s>
> = operator extends {}
    ? buildMissingRightOperandMessage<operator, s["unscanned"]>
    : buildExpressionExpectedMessage<s["unscanned"]>

export type buildMissingRightOperandMessage<
    token extends Scanner.InfixToken,
    unscanned extends string
> = `Token '${token}' requires a right operand${unscanned extends ""
    ? ""
    : ` before '${unscanned}'`}`

export const buildMissingRightOperandMessage = <
    token extends Scanner.InfixToken,
    unscanned extends string
>(
    token: token,
    unscanned: unscanned
): buildMissingRightOperandMessage<token, unscanned> =>
    `Token '${token}' requires a right operand${
        unscanned ? "" : (` before '${unscanned}'` as any)
    }`

export const buildExpressionExpectedMessage = <unscanned extends string>(
    unscanned: unscanned
) =>
    `Expected an expression${
        unscanned ? ` before '${unscanned}'` : ""
    }` as buildExpressionExpectedMessage<unscanned>

export type buildExpressionExpectedMessage<unscanned extends string> =
    `Expected an expression${unscanned extends ""
        ? ""
        : ` before '${unscanned}'`}`
