import { arrayOf } from "../nodes/generics.js"
import type { TypeNode } from "../nodes/node.js"
import type { ScopeRoot } from "../scope.js"
import type { Dict, error, stringKeyOf } from "../utils/generics.js"
import type { inferAst, validateAstSemantics } from "./ast.js"
import { DynamicState } from "./reduce/dynamic.js"
import type { state, StaticState } from "./reduce/static.js"
import { parseOperand } from "./shift/operand/operand.js"
import type { isResolvableIdentifier } from "./shift/operand/unenclosed.js"
import { parseOperator } from "./shift/operator/operator.js"
import type { Scanner } from "./shift/scanner.js"

export const parseString = (def: string, scope: ScopeRoot) =>
    scope.memoizedParse(def)

export type parseString<
    def extends string,
    alias extends string
> = maybeNaiveParse<def, alias>

export type inferString<
    def extends string,
    scope extends Dict,
    aliases
> = inferAst<
    parseString<def, stringKeyOf<aliases> | stringKeyOf<scope>>,
    scope,
    aliases
>

export type validateString<
    def extends string,
    scope extends Dict
> = parseString<def, stringKeyOf<scope>> extends infer astOrError
    ? astOrError extends error<infer message>
        ? message
        : validateAstSemantics<astOrError, scope> extends infer semanticResult
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

export const maybeNaiveParse = (
    def: string,
    scope: ScopeRoot
): TypeNode | undefined => {
    if (def.endsWith("[]")) {
        const elementDef = def.slice(0, -2)
        if (scope.isResolvable(elementDef)) {
            return arrayOf(elementDef)
        }
    }
    if (scope.isResolvable(def)) {
        return def
    }
}

export const fullStringParse = (def: string, scope: ScopeRoot) => {
    const s = new DynamicState(def, scope)
    parseOperand(s)
    return loop(s)
}

type fullStringParse<def extends string, alias extends string> = loop<
    state.initialize<def>,
    alias
>

// TODO: Recursion perf?
const loop = (s: DynamicState) => {
    while (!s.scanner.finalized) {
        next(s)
    }
    return s.ejectFinalizedRoot()
}

type loop<
    s extends StaticState | error,
    alias extends string
> = s extends StaticState ? loopValid<s, alias> : s

type loopValid<
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
