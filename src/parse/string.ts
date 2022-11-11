import type { Scope } from "../scope.js"
import type { dictionary } from "../utils/dynamicTypes.js"
import type { parseError } from "./errors.js"
import { parseOperand } from "./operand/operand.js"
import type { isResolvableIdentifier } from "./operand/unenclosed.js"
import { maybeParseIdentifier } from "./operand/unenclosed.js"
import { parseOperator } from "./operator/operator.js"
import { morphisms } from "./state/attributes/morph.js"
import { DynamicState } from "./state/dynamic.js"
import type { state, StaticState, UnvalidatedState } from "./state/static.js"

export const parseString = (def: string, scope: Scope) => {
    const cache = scope.$.parseCache
    const cachedAttributes = cache.get(def)
    if (!cachedAttributes) {
        const attributes =
            tryNaiveStringParse(def, scope) ?? fullStringParse(def, scope)
        cache.set(def, attributes)
    }
    return cache.get(def)!
}

export type parseString<
    def extends string,
    scope extends dictionary
> = tryNaiveStringParse<def, scope>

export type validateString<
    def extends string,
    scope extends dictionary
> = parseString<def, scope> extends parseError<infer message> ? message : def

const fullStringParse = (def: string, scope: Scope) =>
    loop(parseOperand(new DynamicState(def, scope)))

type fullStringParse<def extends string, scope extends dictionary> = loop<
    parseOperand<state.initialize<def>, scope>,
    scope
>

// TODO: Recursion perf?
const loop = (s: DynamicState) => {
    while (!s.scanner.hasBeenFinalized) {
        next(s)
    }
    return s.finalize()
}

type loop<s extends UnvalidatedState, scope extends dictionary> = s extends {
    unscanned: string
}
    ? loop<next<s, scope>, scope>
    : s["root"]

const next = (s: DynamicState): DynamicState =>
    s.hasRoot() ? parseOperator(s) : parseOperand(s)

type next<s extends StaticState, scope extends dictionary> = s extends {
    root: {}
}
    ? parseOperator<s>
    : parseOperand<s, scope>

/**
 * Try to parse the definition from right to left using the most common syntax.
 * This can be much more efficient for simple definitions.
 */
type tryNaiveStringParse<
    def extends string,
    scope extends dictionary
> = def extends `${infer child}[]`
    ? isResolvableIdentifier<child, scope> extends true
        ? [child, "[]"]
        : fullStringParse<def, scope>
    : isResolvableIdentifier<def, scope> extends true
    ? def
    : fullStringParse<def, scope>

const tryNaiveStringParse = (def: string, scope: Scope) => {
    if (def.endsWith("[]")) {
        const maybeParsedAttributes = maybeParseIdentifier(
            def.slice(0, -2),
            scope
        )
        if (maybeParsedAttributes) {
            return morphisms.array(maybeParsedAttributes)
        }
    }
    return maybeParseIdentifier(def, scope)
}
