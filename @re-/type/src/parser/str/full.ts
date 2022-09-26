import type { Base } from "../../nodes/base.js"
import type { parseFn, parserContext, ParserContext } from "../common.js"
import type { ParseOperand } from "./operand/operand.js"
import { parseOperand } from "./operand/operand.js"
import type { ParseOperator } from "./operator/operator.js"
import { parseOperator } from "./operator/operator.js"
import type { ParserState } from "./state/state.js"
import { parserState } from "./state/state.js"

export const fullParse: parseFn<string> = (def, ctx) =>
    loop(parseOperand(new parserState(def), ctx), ctx)

export type FullParse<Def extends string, Ctx extends ParserContext> = Loop<
    ParseOperand<ParserState.New<Def>, Ctx>,
    Ctx
>

const loop = (s: parserState, ctx: parserContext): Base.node => {
    while (!s.isSuffixable()) {
        next(s, ctx)
    }
    return suffixLoop(transitionToSuffix(s), ctx)
}

type Loop<
    S extends ParserState,
    Ctx extends ParserContext
> = S["R"] extends "END" ? S["L"]["root"] : Loop<Next<S, Ctx>, Ctx>

const next = (s: parserState, ctx: parserContext): parserState =>
    s.hasRoot() ? parseOperator(s, ctx) : parseOperand(s, ctx)

type Next<
    S extends ParserState,
    Ctx extends ParserContext
> = S["L"]["root"] extends undefined ? ParseOperand<S, Ctx> : ParseOperator<S>
