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
import { State } from "../state/state.js"
import { Keyword } from "./keyword.js"
import { Operand } from "./operand.js"

export namespace Unenclosed {
    export const parse = (s: State.Dynamic) => {
        const token = s.scanner.shiftUntilNextTerminator()
        s.root = unenclosedToAttributes(s, token)
        return s
    }

    export type parse<
        s extends State.Static,
        context extends StaticParserContext
    > = Scanner.shiftUntilNextTerminator<
        s["unscanned"]
    > extends Scanner.ShiftResult<infer scanned, infer nextUnscanned>
        ? setRootOrCatch<s, resolve<s, scanned, context>, nextUnscanned>
        : never

    const unenclosedToAttributes = (s: State.Dynamic, token: string) =>
        maybeParseIdentifier(token, s.context) ??
        maybeParseUnenclosedLiteral(token) ??
        State.error(
            token === ""
                ? Operand.buildMissingOperandMessage(s)
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
        s extends State.Static,
        resolved extends string,
        unscanned extends string
    > = resolved extends ParseError<infer message>
        ? State.error<message>
        : State.setRoot<s, resolved, unscanned>

    export const buildUnresolvableMessage = <token extends string>(
        token: token
    ): buildUnresolvableMessage<token> =>
        `'${token}' is not a builtin type or alias`

    type buildUnresolvableMessage<token extends string> =
        `'${token}' is not a builtin type or alias`

    export type isResolvableIdentifier<
        token,
        context extends StaticParserContext
    > = token extends Keyword
        ? true
        : token extends keyof context["aliases"]
        ? true
        : false

    type resolve<
        s extends State.Static,
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
                  ? Operand.buildMissingOperandMessage<s>
                  : buildUnresolvableMessage<token>
          >
}
