import { type error, throwParseError } from "../../../dev/utils/src/main.js"
import type { TypeNode } from "../../nodes/composite/type.js"
import type { ParseContext } from "../../scope.js"
import { type inferAst, writeUnsatisfiableExpressionError } from "../ast/ast.js"
import type { DynamicStateWithRoot } from "./reduce/dynamic.js"
import { DynamicState } from "./reduce/dynamic.js"
import type { StringifiablePrefixOperator } from "./reduce/shared.js"
import type { state, StaticState } from "./reduce/static.js"
import { parseOperand } from "./shift/operand/operand.js"
import type { writeUnexpectedCharacterMessage } from "./shift/operator/operator.js"
import { parseOperator } from "./shift/operator/operator.js"

export const parseString = (def: string, ctx: ParseContext): TypeNode =>
    ctx.scope.maybeResolveNode(def, ctx) ??
    ((def.endsWith("[]") &&
        ctx.scope.maybeResolveNode(def.slice(0, -2), ctx)?.array()) ||
        fullStringParse(def, ctx))

/**
 * Try to parse the definition from right to left using the most common syntax.
 * This can be much more efficient for simple definitions.
 */
export type parseString<def extends string, $, args> = def extends keyof $
    ? // def could also be an arg here, in which case the arg resolution will
      // end up having precedence during inference as normal.
      def
    : def extends `${infer child}[]`
    ? child extends keyof $
        ? [child, "[]"]
        : fullStringParse<def, $, args>
    : fullStringParse<def, $, args>

export type inferString<def extends string, $, args> = inferAst<
    parseString<def, $, args>,
    $,
    args
>

export type BaseCompletions<$, args, otherSuggestions extends string = never> =
    | (keyof $ & string)
    | (keyof args & string)
    | StringifiablePrefixOperator
    | otherSuggestions

export const fullStringParse = (def: string, ctx: ParseContext) => {
    const s = new DynamicState(def, ctx)
    parseOperand(s)
    const result = parseUntilFinalizer(s).root
    return result.isNever()
        ? throwParseError(writeUnsatisfiableExpressionError(def))
        : result
}

type fullStringParse<def extends string, $, args> = extractFinalizedResult<
    parseUntilFinalizer<state.initialize<def>, $, args>
>

export const parseUntilFinalizer = (s: DynamicState) => {
    while (s.finalizer === undefined) {
        next(s)
    }
    return s as DynamicStateWithRoot
}

export type parseUntilFinalizer<
    s extends StaticState,
    $,
    args
> = s["finalizer"] extends undefined
    ? parseUntilFinalizer<next<s, $, args>, $, args>
    : s

const next = (s: DynamicState) =>
    s.hasRoot() ? parseOperator(s) : parseOperand(s)

type next<s extends StaticState, $, args> = s["root"] extends undefined
    ? parseOperand<s, $, args>
    : parseOperator<s>

export type extractFinalizedResult<s extends StaticState> =
    s["finalizer"] extends error
        ? s["finalizer"]
        : s["finalizer"] extends ""
        ? s["root"]
        : error<writeUnexpectedCharacterMessage<`${s["finalizer"]}`>>
