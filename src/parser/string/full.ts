import type { DynamicParserContext, StaticParserContext } from "../common.js"
import { Operand } from "./operand/operand.js"
import { Operator } from "./operator/operator.js"
import { State } from "./state/state.js"

export const fullParse = (def: string, context: DynamicParserContext) =>
    loop(Operand.parse(State.initialize(def), context), context)

export type fullParse<
    Def extends string,
    Ctx extends StaticParserContext
> = Loop<Operand.parse<State.initialize<Def>, Ctx>, Ctx>

// TODO: Recursion perf?
const loop = (s: State.Dynamic, context: DynamicParserContext) => {
    while (!s.scanner.hasBeenFinalized) {
        next(s, context)
    }
    return s.root!
}

type Loop<
    s extends State.Unvalidated,
    context extends StaticParserContext
> = s extends { unscanned: string }
    ? Loop<Next<s, context>, context>
    : s["root"]

const next = (s: State.Dynamic, context: DynamicParserContext): State.Dynamic =>
    State.hasRoot(s) ? Operator.parse(s) : Operand.parse(s, context)

type Next<
    s extends State.Static,
    context extends StaticParserContext
> = s extends { root: {} } ? Operator.parse<s> : Operand.parse<s, context>
