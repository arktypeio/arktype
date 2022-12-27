import { functorKeywords } from "../../nodes/keywords.ts"
import type { TypeNode } from "../../nodes/node.ts"
import { isResolvable, memoizedParse } from "../../nodes/utils.ts"
import type { aliasOf, Scope } from "../../scope.ts"
import { type } from "../../type.ts"
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

export type parseString<
    def extends string,
    alias extends string
> = maybeNaiveParse<def, alias>

export type inferString<def extends string, s extends Scope> = inferAst<
    parseString<def, aliasOf<s>>,
    s
>

export type validateString<def extends string, s extends Scope> = parseString<
    def,
    aliasOf<s>
> extends infer astOrError
    ? astOrError extends error<infer message>
        ? message
        : validateAstSemantics<astOrError, s> extends infer semanticResult
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
