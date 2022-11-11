import type { Scope } from "../../scope.js"
import type { dictionary } from "../../utils/dynamicTypes.js"
import type { catches, returns, throws } from "../../utils/generics.js"
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

type Z = parseUnenclosed<state.initialize<"543">, {}>

export type parseUnenclosed<
    s extends StaticState,
    scope extends dictionary
> = Scanner.shiftUntilNextTerminator<
    s["unscanned"]
> extends Scanner.shiftResult<infer scanned, infer nextUnscanned>
    ? tryResolve<s, scanned, scope> extends catches<
          infer resolution,
          infer message
      >
        ? message extends ""
            ? state.setRoot<s, resolution, nextUnscanned>
            : state.error<message>
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
    ? returns<token>
    : token extends NumberLiteral<infer value>
    ? number extends value
        ? throws<buildMalformedNumericLiteralMessage<token, "number">>
        : returns<value>
    : token extends BigintLiteral<infer value>
    ? bigint extends value
        ? throws<buildMalformedNumericLiteralMessage<token, "bigint">>
        : returns<value>
    : throws<
          token extends ""
              ? buildMissingOperandMessage<s>
              : buildUnresolvableMessage<token>
      >
