import type { Scope } from "../../scope.js"
import type { dictionary } from "../../utils/dynamicTypes.js"
import type { error, is } from "../../utils/generics.js"
import type {
    BigintLiteral,
    buildMalformedNumericLiteralMessage,
    NumberLiteral
} from "../../utils/numericLiterals.js"
import {
    tryParseWellFormedBigint,
    tryParseWellFormedNumber
} from "../../utils/numericLiterals.js"
import { parseRoot } from "../parse.js"
import type { DynamicState } from "../state/dynamic.js"
import type { Scanner } from "../state/scanner.js"
import type { state, StaticState } from "../state/static.js"
import { Keyword } from "./keyword.js"
import { buildMissingOperandMessage } from "./operand.js"

export const parseUnenclosed = (s: DynamicState) => {
    const token = s.scanner.shiftUntilNextTerminator()
    s.setRoot(unenclosedToAttributes(s, token))
}

export type parseUnenclosed<
    s extends StaticState,
    scope extends dictionary
> = Scanner.shiftUntilNextTerminator<
    s["unscanned"]
> extends Scanner.shiftResult<infer scanned, infer nextUnscanned>
    ? tryResolve<s, scanned, scope> extends is<infer result>
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

export const maybeParseIdentifier = (token: string, scope: Scope) =>
    Keyword.matches(token)
        ? Keyword.attributes[token]()
        : scope.$.aliases[token]
        ? parseAlias(token, scope)
        : scope.$.config.scope?.$.attributes[token]

const parseAlias = (name: string, scope: Scope) => {
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

export const buildUnresolvableMessage = <token extends string>(
    token: token
): buildUnresolvableMessage<token> => `'${token}' is unresolvable`

type buildUnresolvableMessage<token extends string> =
    `'${token}' is unresolvable`

export type isResolvableIdentifier<
    token,
    scope extends dictionary
> = token extends Keyword ? true : token extends keyof scope ? true : false

type tryResolve<
    s extends StaticState,
    token extends string,
    scope extends dictionary
> = isResolvableIdentifier<token, scope> extends true
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
