import type { DynamicScope } from "../scope.js"
import type { dictionary } from "../utils/dynamicTypes.js"
import type { error, is, stringKeyOf } from "../utils/generics.js"
import type { inferAst, validateAstSemantics } from "./ast.js"
import { morph } from "./reduce/attributes/morph.js"
import { DynamicState } from "./reduce/dynamic.js"
import type { Scanner } from "./reduce/scanner.js"
import type { state, StaticState } from "./reduce/static.js"
import { parseOperand } from "./shift/operand/operand.js"
import type { isResolvableIdentifier } from "./shift/operand/unenclosed.js"
import { maybeParseIdentifier } from "./shift/operand/unenclosed.js"
import { parseOperator } from "./shift/operator/operator.js"

export const parseString = (def: string, scope: DynamicScope) => {
    const cache = scope.$.parseCache
    const cachedAttributes = cache.get(def)
    if (!cachedAttributes) {
        const attributes =
            maybeNaiveParse(def, scope) ?? fullStringParse(def, scope)
        cache.set(def, attributes)
    }
    return cache.get(def)!
}

export type parseString<
    def extends string,
    alias extends string
> = maybeNaiveParse<def, alias>

export type inferString<
    def extends string,
    scope extends dictionary,
    aliases
> = inferAst<
    parseString<def, stringKeyOf<aliases> | stringKeyOf<scope>>,
    scope,
    aliases
>

export type validateString<
    def extends string,
    scope extends dictionary
> = parseString<def, stringKeyOf<scope>> extends infer astOrError
    ? astOrError extends error<infer message>
        ? message
        : validateAstSemantics<astOrError, scope> extends is<
              infer semanticResult
          >
        ? semanticResult extends undefined
            ? def
            : semanticResult
        : never
    : never

/**
 * Try to parse the definition from right to left using the most common syntax.
 * This can be much more efficient for simple definitions.
 */
type maybeNaiveParse<
    def extends string,
    alias extends string
> = def extends `${infer child}[]`
    ? isResolvableIdentifier<child, alias> extends true
        ? [child, "[]"]
        : fullStringParse<def, alias>
    : isResolvableIdentifier<def, alias> extends true
    ? def
    : fullStringParse<def, alias>

const maybeNaiveParse = (def: string, scope: DynamicScope) => {
    if (def.endsWith("[]")) {
        const maybeParsedAttributes = maybeParseIdentifier(
            def.slice(0, -2),
            scope
        )
        if (maybeParsedAttributes) {
            return morph("array", maybeParsedAttributes)
        }
    }
    return maybeParseIdentifier(def, scope)
}

const fullStringParse = (def: string, scope: DynamicScope) => {
    const s = new DynamicState(def, scope)
    parseOperand(s)
    return loop(s)
}

type fullStringParse<def extends string, alias extends string> = loop<
    parseOperand<state.initialize<def>, alias>,
    alias
>

// TODO: Recursion perf?
const loop = (s: DynamicState) => {
    while (!s.scanner.finalized) {
        next(s)
    }
    return s.ejectRoot()
}

type loop<
    s extends StaticState,
    alias extends string
> = s["unscanned"] extends Scanner.finalized
    ? s["root"]
    : loop<next<s, alias>, alias>

const next = (s: DynamicState) =>
    s.hasRoot() ? parseOperator(s) : parseOperand(s)

type next<
    s extends StaticState,
    alias extends string
> = s["root"] extends undefined ? parseOperand<s, alias> : parseOperator<s>
