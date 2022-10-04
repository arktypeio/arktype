import type { parseFn, parserContext, ParserContext } from "../common.js"
import { Operand } from "./operand/operand.js"
import type { Operator } from "./operator/operator.js"
import { operator } from "./operator/operator.js"
import type { ParserState } from "./state/state.js"
import { parserState } from "./state/state.js"

export const fullParse: parseFn<string> = (def, ctx) =>
    loop(Operand.parse(parserState.initialize(def), ctx), ctx)

export type FullParse<Def extends string, Ctx extends ParserContext> = Loop<
    Operand.Parse<ParserState.initialize<Def>, Ctx>,
    Ctx
>

// TODO: Recursion perf?
const loop = (s: parserState, ctx: parserContext) => {
    while (!s.scanner.hasBeenFinalized) {
        next(s, ctx)
    }
    return s.root!
}

type Loop<
    S extends ParserState.Unvalidated,
    Ctx extends ParserContext
> = S extends ParserState.Unfinalized ? Loop<Next<S, Ctx>, Ctx> : S["root"]

const next = (s: parserState, ctx: parserContext): parserState =>
    parserState.hasRoot(s) ? operator.parse(s) : Operand.parse(s, ctx)

type Next<
    S extends ParserState,
    Ctx extends ParserContext
> = S extends ParserState.HasRoot ? Operator.parse<S> : Operand.Parse<S, Ctx>
