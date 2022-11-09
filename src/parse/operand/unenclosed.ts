import type {
    assertWellFormed,
    assertWellFormedBigint,
    BigintLiteral,
    NumberLiteral
} from "../../utils/numericLiterals.js"
import {
    parseWellFormedBigint,
    parseWellFormedNumber
} from "../../utils/numericLiterals.js"
import type {
    DynamicParserContext,
    ParseError,
    StaticParserContext
} from "../common.js"
import { parseRoot } from "../parse.js"
import type { Scanner } from "../state/scanner.js"
import type { DynamicState, setStateRoot, StaticState } from "../state/state.js"
import { errorState } from "../state/state.js"
import { Keyword } from "./keyword.js"
import { buildMissingOperandMessage } from "./operand.js"

export const parseUnenclosed = (s: DynamicState) => {
    const token = s.scanner.shiftUntilNextTerminator()
    s.root.reinitialize(unenclosedToAttributes(s, token))
    return s
}

export type parseUnenclosed<
    s extends StaticState,
    context extends StaticParserContext
> = Scanner.shiftUntilNextTerminator<
    s["unscanned"]
> extends Scanner.ShiftResult<infer scanned, infer nextUnscanned>
    ? setRootOrCatch<s, resolve<s, scanned, context>, nextUnscanned>
    : never

const unenclosedToAttributes = (s: DynamicState, token: string) =>
    maybeParseIdentifier(token, s.context) ??
    maybeParseUnenclosedLiteral(token) ??
    errorState(
        token === ""
            ? buildMissingOperandMessage(s)
            : buildUnresolvableMessage(token)
    )

export const maybeParseIdentifier = (
    token: string,
    context: DynamicParserContext
) =>
    Keyword.matches(token)
        ? Keyword.attributes[token]()
        : context.scopeRoot.aliases[token]
        ? parseAlias(token, context)
        : context.scopeRoot.config.scope?.$.attributes[token]

const parseAlias = (name: string, context: DynamicParserContext) => {
    const cache = context.scopeRoot.parseCache
    const cachedAttributes = cache.get(name)
    if (!cachedAttributes) {
        // Set the resolution to a shallow reference until the alias has
        // been fully parsed in case it cyclicly references itself
        cache.set(name, { alias: name })
        cache.set(
            name,
            parseRoot(context.scopeRoot.aliases[name], context.scopeRoot)
        )
    }
    return cache.get(name)
}

const maybeParseUnenclosedLiteral = (token: string) => {
    const maybeNumber = parseWellFormedNumber(token)
    if (maybeNumber !== undefined) {
        return { value: token as NumberLiteral }
    }
    const maybeBigint = parseWellFormedBigint(token)
    if (maybeBigint !== undefined) {
        return { value: token as BigintLiteral }
    }
}

type setRootOrCatch<
    s extends StaticState,
    resolved extends string,
    unscanned extends string
> = resolved extends ParseError<infer message>
    ? errorState<message>
    : setStateRoot<s, resolved, unscanned>

export const buildUnresolvableMessage = <token extends string>(
    token: token
): buildUnresolvableMessage<token> => `'${token}' is unresolvable`

type buildUnresolvableMessage<token extends string> =
    `'${token}' is unresolvable`

export type isResolvableIdentifier<
    token,
    context extends StaticParserContext
> = token extends Keyword
    ? true
    : token extends keyof context["aliases"]
    ? true
    : false

type resolve<
    s extends StaticState,
    token extends string,
    context extends StaticParserContext
> = isResolvableIdentifier<token, context> extends true
    ? token
    : token extends NumberLiteral<infer Value>
    ? assertWellFormed<token, Value, "number">
    : token extends BigintLiteral<infer Value>
    ? assertWellFormedBigint<token, Value>
    : ParseError<
          token extends ""
              ? buildMissingOperandMessage<s>
              : buildUnresolvableMessage<token>
      >
