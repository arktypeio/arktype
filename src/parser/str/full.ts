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
const loop = (s: ParserState.Base, ctx: parserContext) => {
    while (!s.scanner.hasBeenFinalized) {
        next(s, ctx)
    }
    return s.root!
}

type Loop<
    s extends ParserState.T.Base,
    ctx extends ParserContext
> = s extends ParserState.T.Incomplete ? Loop<Next<s, ctx>, ctx> : s["root"]

const next = (s: ParserState.Base, ctx: parserContext): ParserState.Base =>
    ParserState.hasRoot(s) ? Operator.parse(s) : Operand.parse(s, ctx)

type Next<
    s extends ParserState.T.Unfinished,
    ctx extends ParserContext
> = s extends { root: {} } ? Operator.parse<s> : Operand.parse<s, ctx>
