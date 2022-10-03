import type { InternalSpace } from "../../space.js"
import type { parseFn, ParserContext } from "../common.js"
import { Operand } from "./operand/operand.js"
import { Operator } from "./operator/operator.js"
import type { ParserState } from "./state/state.js"
import { parserState } from "./state/state.js"

export const fullParse: parseFn<string> = (def, ctx) =>
    loop(Operand.parse(new parserState(def), ctx), ctx)

export type FullParse<Def extends string, Ctx extends ParserContext> = Loop<
    Operand.Parse<ParserState.New<Def>, Ctx>,
    Ctx
>

// TODO: Recursion perf?
const loop = (s: parserState, space: InternalSpace) => {
    while (!s.l.done) {
        next(s, space)
    }
    return s.l.root!
}

type Loop<
    S extends ParserState,
    Ctx extends ParserContext
> = S["L"]["done"] extends true ? S["L"]["root"] : Loop<Next<S, Ctx>, Ctx>

const next = (s: parserState, space: InternalSpace): parserState =>
    s.hasRoot() ? Operator.parse(s) : Operand.parse(s, space)

type Next<S extends ParserState, Ctx extends ParserContext> = S extends {
    L: { root: {} }
}
    ? Operator.Parse<S>
    : Operand.Parse<S, Ctx>
