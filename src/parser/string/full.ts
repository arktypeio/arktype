import type { ParserContext, StaticParserContext } from "../common.js"
import { Operand } from "./operand/operand.js"
import { Operator } from "./operator/operator.js"
import { ParserState } from "./state/state.js"

export const fullParse = (def: string, context: ParserContext) =>
    loop(Operand.parse(ParserState.initialize(def), context), context)

export type fullParse<
    Def extends string,
    Ctx extends StaticParserContext
> = Loop<Operand.parse<ParserState.initialize<Def>, Ctx>, Ctx>

// TODO: Recursion perf?
const loop = (s: ParserState.Base, context: ParserContext) => {
    while (!s.scanner.hasBeenFinalized) {
        next(s, context)
    }
    return s.root!
}

type Loop<
    s extends ParserState.T.Base,
    context extends StaticParserContext
> = s extends ParserState.T.Incomplete
    ? Loop<Next<s, context>, context>
    : s["root"]

const next = (s: ParserState.Base, context: ParserContext): ParserState.Base =>
    ParserState.hasRoot(s) ? Operator.parse(s) : Operand.parse(s, context)

type Next<
    s extends ParserState.T.Unfinished,
    context extends StaticParserContext
> = s extends { root: {} } ? Operator.parse<s> : Operand.parse<s, context>
