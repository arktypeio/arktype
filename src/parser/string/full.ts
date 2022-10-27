import type { ParserContext, StaticParserContext } from "../common.js"
import { Operand } from "./operand/operand.js"
import { Operator } from "./operator/operator.js"
import type { StaticState } from "./state/state.js"
import { DynamicState } from "./state/state.js"

export const fullParse = (def: string, context: ParserContext) =>
    loop(Operand.parse(DynamicState.initialize(def), context), context)

export type fullParse<
    Def extends string,
    Ctx extends StaticParserContext
> = Loop<Operand.parse<StaticState.initialize<Def>, Ctx>, Ctx>

// TODO: Recursion perf?
const loop = (s: DynamicState, context: ParserContext) => {
    while (!s.scanner.hasBeenFinalized) {
        next(s, context)
    }
    return s.root!
}

type Loop<
    s extends StaticState.Unvalidated,
    context extends StaticParserContext
> = s extends { unscanned: string }
    ? Loop<Next<s, context>, context>
    : s["root"]

const next = (s: DynamicState, context: ParserContext): DynamicState =>
    DynamicState.hasRoot(s) ? Operator.parse(s) : Operand.parse(s, context)

type Next<
    s extends StaticState,
    context extends StaticParserContext
> = s extends { root: {} } ? Operator.parse<s> : Operand.parse<s, context>
