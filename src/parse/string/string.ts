import { toArrayNode } from "../../nodes/node.js"
import type { error } from "../../utils/generics.js"
import type { inferAst } from "../ast/ast.js"
import type { ParseContext } from "../definition.js"
import { DynamicState } from "./reduce/dynamic.js"
import type { state, StaticState } from "./reduce/static.js"
import { parseOperand } from "./shift/operand/operand.js"
import { parseOperator } from "./shift/operator/operator.js"
import type { Scanner } from "./shift/scanner.js"

export const parseString = (def: string, ctx: ParseContext) =>
    ctx.type.scope.parseCache.get(def) ??
    ctx.type.scope.parseCache.set(
        def,
        maybeNaiveParse(def, ctx) ?? fullStringParse(def, ctx)
    )

export type parseString<def extends string, $> = maybeNaiveParse<def, $>

export type inferString<def extends string, $> = inferAst<
    parseString<def, $>,
    $
>

/**
 * Try to parse the definition from right to left using the most common syntax.
 * This can be much more efficient for simple definitions.
 */
type maybeNaiveParse<def extends string, $> = def extends `${infer child}[]`
    ? child extends keyof $
        ? [child, "[]"]
        : fullStringParse<def, $>
    : def extends keyof $
    ? def
    : fullStringParse<def, $>

export const maybeNaiveParse = (def: string, ctx: ParseContext) => {
    if (ctx.type.scope.addParsedReferenceIfResolvable(def, ctx)) {
        return def
    }
    if (def.endsWith("[]")) {
        const elementDef = def.slice(0, -2)
        if (ctx.type.scope.addParsedReferenceIfResolvable(def, ctx)) {
            return toArrayNode(elementDef)
        }
    }
}

export const fullStringParse = (def: string, ctx: ParseContext) => {
    const s = new DynamicState(def, ctx)
    parseOperand(s)
    return loop(s)
}

type fullStringParse<def extends string, $> = loop<state.initialize<def>, $>

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
