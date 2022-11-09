import type {
    DynamicParserContext,
    ParseError,
    StaticParserContext
} from "./common.js"
import { parseOperand } from "./operand/operand.js"
import type { isResolvableIdentifier } from "./operand/unenclosed.js"
import { maybeParseIdentifier } from "./operand/unenclosed.js"
import { arrayOf } from "./operator/array.js"
import { parseOperator } from "./operator/operator.js"
import { State } from "./state/state.js"

export const parseString = (
    definition: string,
    context: DynamicParserContext
) => {
    const cache = context.scopeRoot.parseCache
    const cachedAttributes = cache.get(definition)
    if (!cachedAttributes) {
        const attributes =
            tryNaiveStringParse(definition, context) ??
            fullStringParse(definition, context)
        cache.set(definition, attributes)
    }
    return cache.get(definition)!
}

export type parseString<
    def extends string,
    context extends StaticParserContext
> = tryNaiveStringParse<def, context>

export type validateString<
    def extends string,
    context extends StaticParserContext
> = parseString<def, context> extends ParseError<infer Message> ? Message : def

const fullStringParse = (def: string, context: DynamicParserContext) =>
    loop(parseOperand(State.initialize(def, context)))

type fullStringParse<
    def extends string,
    context extends StaticParserContext
> = loop<parseOperand<State.initialize<def>, context>, context>

// TODO: Recursion perf?
const loop = (s: State.Dynamic) => {
    while (!s.scanner.hasBeenFinalized) {
        next(s)
    }
    return s.root!
}

type loop<
    s extends State.Unvalidated,
    context extends StaticParserContext
> = s extends { unscanned: string }
    ? loop<next<s, context>, context>
    : s["root"]

const next = (s: State.Dynamic): State.Dynamic =>
    State.hasRoot(s) ? parseOperator(s) : parseOperand(s)

type next<
    s extends State.Static,
    context extends StaticParserContext
> = s extends { root: {} } ? parseOperator<s> : parseOperand<s, context>

/**
 * Try to parse the definition from right to left using the most common syntax.
 * This can be much more efficient for simple definitions. Unfortunately,
 * parsing from right to left makes maintaining a tree that can either be returned
 * or discarded in favor of a full parse tree much more costly.
 *
 * Hence, this repetitive (but efficient) shallow parse that decides whether to
 * delegate parsing in a single pass.
 */
type tryNaiveStringParse<
    def extends string,
    context extends StaticParserContext
> = def extends `${infer child}[]`
    ? isResolvableIdentifier<child, context> extends true
        ? [child, "[]"]
        : fullStringParse<def, context>
    : isResolvableIdentifier<def, context> extends true
    ? def
    : fullStringParse<def, context>

const tryNaiveStringParse = (def: string, context: DynamicParserContext) => {
    if (def.endsWith("[]")) {
        const maybeParsedAttributes = maybeParseIdentifier(
            def.slice(0, -2),
            context
        )
        if (maybeParsedAttributes) {
            return arrayOf(maybeParsedAttributes)
        }
    }
    return maybeParseIdentifier(def, context)
}
