import { assignIntersection } from "../attributes/intersection.js"
import type {
    DynamicParserContext,
    ParseError,
    StaticParserContext
} from "./common.js"
import { Operand } from "./operand/operand.js"
import { Unenclosed } from "./operand/unenclosed.js"
import { ArrayOperator } from "./operator/array.js"
import { Operator } from "./operator/operator.js"
import { State } from "./state/state.js"

export const parseString = (def: string, context: DynamicParserContext) =>
    tryNaiveStringParse(def, context) ?? fullStringParse(def, context)

export type parseString<
    def extends string,
    context extends StaticParserContext
> = tryNaiveStringParse<def, context>

export type validateString<
    def extends string,
    context extends StaticParserContext
> = parseString<def, context> extends ParseError<infer Message> ? Message : def

const fullStringParse = (def: string, context: DynamicParserContext) =>
    loop(Operand.parse(State.initialize(def, context)))

type fullStringParse<
    def extends string,
    context extends StaticParserContext
> = loop<Operand.parse<State.initialize<def>, context>, context>

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
    State.hasRoot(s) ? Operator.parse(s) : Operand.parse(s)

type next<
    s extends State.Static,
    context extends StaticParserContext
> = s extends { root: {} } ? Operator.parse<s> : Operand.parse<s, context>

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
> = def extends `${infer Child}?`
    ? Child extends `${infer GrandChild}[]`
        ? Unenclosed.isResolvableIdentifier<GrandChild, context> extends true
            ? [[GrandChild, "[]"], "?"]
            : fullStringParse<def, context>
        : Unenclosed.isResolvableIdentifier<Child, context> extends true
        ? [Child, "?"]
        : fullStringParse<def, context>
    : def extends `${infer Child}[]`
    ? Unenclosed.isResolvableIdentifier<Child, context> extends true
        ? [Child, "[]"]
        : fullStringParse<def, context>
    : Unenclosed.isResolvableIdentifier<def, context> extends true
    ? def
    : fullStringParse<def, context>

const tryNaiveStringParse = (def: string, context: DynamicParserContext) => {
    if (def.endsWith("?")) {
        const maybeParsedAttributes = tryNaiveArrayParse(
            def.slice(0, -1),
            context
        )
        if (maybeParsedAttributes) {
            return assignIntersection(
                maybeParsedAttributes,
                { optional: true },
                context
            )
        }
    }
    return tryNaiveArrayParse(def, context)
}

const tryNaiveArrayParse = (def: string, context: DynamicParserContext) => {
    if (def.endsWith("[]")) {
        const maybeParsedAttributes = Unenclosed.maybeParseIdentifier(
            def.slice(0, -2),
            context
        )
        if (maybeParsedAttributes) {
            return ArrayOperator.arrayOf(maybeParsedAttributes)
        }
    }
    return Unenclosed.maybeParseIdentifier(def, context)
}
