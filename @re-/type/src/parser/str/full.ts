import type { parseFn, parserContext, ParserContext } from "../common.js"
import { Operand } from "./operand/operand.js"
import { Operator } from "./operator/operator.js"
import { ParserState } from "./state/state.js"

export const fullParse: parseFn<string> = (def, ctx) =>
    loop(Operand.parse(ParserState.initialize(def), ctx), ctx)

export type FullParse<Def extends string, Ctx extends ParserContext> = Loop<
    Operand.parse<ParserState.initialize<Def>, Ctx>,
    Ctx
>

// TODO: Recursion perf?
const loop = (s: ParserState, ctx: parserContext) => {
    while (!s.scanner.hasBeenFinalized) {
        next(s, ctx)
    }
    return s.root!
}

type Loop<
    S extends ParserState.T.Unvalidated,
    Ctx extends ParserContext
> = S extends ParserState.T.Unfinalized ? Loop<Next<S, Ctx>, Ctx> : S["root"]

const next = (s: ParserState, ctx: parserContext): ParserState =>
    ParserState.hasRoot(s) ? Operator.parse(s) : Operand.parse(s, ctx)

type Next<
    S extends ParserState.T,
    Ctx extends ParserContext
> = S extends ParserState.hasRoot ? Operator.parse<S> : Operand.parse<S, Ctx>
