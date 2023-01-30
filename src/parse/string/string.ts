import { functors } from "../../nodes/functors.ts"
import type { error } from "../../utils/generics.ts"
import type { ParseContext } from "../definition.ts"
import type { inferAst, validateAstSemantics } from "./ast.ts"
import { DynamicState } from "./reduce/dynamic.ts"
import type { state, StaticState } from "./reduce/static.ts"
import { parseOperand } from "./shift/operand/operand.ts"
import type { isResolvableIdentifier } from "./shift/operand/unenclosed.ts"
import { parseOperator } from "./shift/operator/operator.ts"
import type { Scanner } from "./shift/scanner.ts"

export const parseString = (def: string, ctx: ParseContext) =>
    ctx.$.parseCache.get(def) ??
    ctx.$.parseCache.set(
        def,
        maybeNaiveParse(def, ctx) ?? fullStringParse(def, ctx)
    )

export type parseString<def extends string, $> = maybeNaiveParse<def, $>

export type inferString<def extends string, $> = inferAst<
    parseString<def, $>,
    $
>

export type validateString<def extends string, $> = parseString<
    def,
    $
> extends infer ast
    ? ast extends error<infer message>
        ? message
        : validateAstSemantics<ast, $> extends error<infer message>
        ? message
        : def
    : never

/**
 * Try to parse the definition from right to left using the most common syntax.
 * This can be much more efficient for simple definitions.
 */
type maybeNaiveParse<def extends string, $> = def extends `${infer child}[]`
    ? isResolvableIdentifier<child, $> extends true
        ? [child, "[]"]
        : fullStringParse<def, $>
    : isResolvableIdentifier<def, $> extends true
    ? def
    : fullStringParse<def, $>

export const maybeNaiveParse = (def: string, ctx: ParseContext) => {
    if (ctx.$.maybeResolve(def)) {
        return def
    }
    if (def.endsWith("[]")) {
        const elementDef = def.slice(0, -2)
        if (ctx.$.maybeResolve(def)) {
            return functors.Array(elementDef)
        }
    }
}

export const fullStringParse = (def: string, ctx: ParseContext) => {
    const s = new DynamicState(def, ctx)
    parseOperand(s)
    return loop(s)
}

type fullStringParse<def extends string, $> = loop<state.initialize<def>, $>

// TODO: Recursion perf?
const loop = (s: DynamicState) => {
    while (!s.scanner.finalized) {
        next(s)
    }
    return s.ejectFinalizedRoot()
}

type loop<s extends StaticState | error, $> = s extends StaticState
    ? loopValid<s, $>
    : s

type loopValid<
    s extends StaticState,
    $
> = s["unscanned"] extends Scanner.finalized ? s["root"] : loop<next<s, $>, $>

const next = (s: DynamicState) =>
    s.hasRoot() ? parseOperator(s) : parseOperand(s)

type next<s extends StaticState, $> = s["root"] extends undefined
    ? parseOperand<s, $>
    : parseOperator<s>
