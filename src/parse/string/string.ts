import { functorKeywords } from "../../nodes/keywords.ts"
import type { TypeNode } from "../../nodes/node.ts"
import { isResolvable, memoizedParse } from "../../nodes/utils.ts"
import type { Scope } from "../../scope.ts"
import type { error } from "../../utils/generics.ts"
import type { inferAst, validateAstSemantics } from "./ast.ts"
import { DynamicState } from "./reduce/dynamic.ts"
import type { state, StaticState } from "./reduce/static.ts"
import { parseOperand } from "./shift/operand/operand.ts"
import type { isResolvableIdentifier } from "./shift/operand/unenclosed.ts"
import { parseOperator } from "./shift/operator/operator.ts"
import type { Scanner } from "./shift/scanner.ts"

export const parseString = (def: string, scope: Scope) =>
    memoizedParse(scope, def)

export type parseString<def extends string, aliases> = maybeNaiveParse<
    def,
    aliases
>

export type inferString<def extends string, aliases> = inferAst<
    parseString<def, aliases>,
    aliases
>

export type validateString<def extends string, aliases> = parseString<
    def,
    aliases
> extends infer result
    ? result extends error<infer message>
        ? message
        : validateAstSemantics<result, aliases> extends infer semanticResult
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
    aliases
> = def extends `${infer child}[]`
    ? isResolvableIdentifier<child, aliases> extends true
        ? [child, "[]"]
        : fullStringParse<def, aliases>
    : isResolvableIdentifier<def, aliases> extends true
    ? def
    : fullStringParse<def, aliases>

export const maybeNaiveParse = (
    def: string,
    scope: Scope
): TypeNode | undefined => {
    if (def.endsWith("[]")) {
        const elementDef = def.slice(0, -2)
        if (isResolvable(scope, elementDef)) {
            return functorKeywords.Array(elementDef)
        }
    }
    if (isResolvable(scope, def)) {
        return def
    }
}

export const fullStringParse = (def: string, scope: Scope) => {
    const s = new DynamicState(def, scope)
    parseOperand(s)
    return loop(s)
}

type fullStringParse<def extends string, aliases> = loop<
    state.initialize<def>,
    aliases
>

// TODO: Recursion perf?
const loop = (s: DynamicState) => {
    while (!s.scanner.finalized) {
        next(s)
    }
    return s.ejectFinalizedRoot()
}

type loop<s extends StaticState | error, aliases> = s extends StaticState
    ? loopValid<s, aliases>
    : s

type loopValid<
    s extends StaticState,
    aliases
> = s["unscanned"] extends Scanner.finalized
    ? s["root"]
    : loop<next<s, aliases>, aliases>

const next = (s: DynamicState) =>
    s.hasRoot() ? parseOperator(s) : parseOperand(s)

type next<s extends StaticState, aliases> = s["root"] extends undefined
    ? parseOperand<s, aliases>
    : parseOperator<s>
