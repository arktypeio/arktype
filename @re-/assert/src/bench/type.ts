import { SyntaxKind, ts } from "ts-morph"
import {
    getReAssertConfig,
    positionToString,
    SourcePosition
} from "../common.js"
import {
    getTraceData,
    getTsProject,
    tsNodeAtPosition
} from "../type/analysis.js"
import { findCallExpressionAncestor } from "../value/snapshot.js"
import { compareToBaseline, updateBaselineIfNeeded } from "./baseline.js"
import { BenchContext } from "./bench.js"
import {
    createMeasure,
    createMeasureComparison,
    MeasureString,
    stringifyMeasure
} from "./measure.js"

export const getBenchTypeAssertions = (
    position: SourcePosition,
    ctx: BenchContext
) => {
    return {
        type: (baseline?: MeasureString) => {
            const config = getReAssertConfig()
            const benchFn = findCallExpressionAncestor(
                position,
                "bench"
            ).getArguments()[1]
            benchFn.getType()
            const trace: any[] = getTraceData()
            const benchCheckEvent = trace.find(
                (event) =>
                    event.name === "checkExpression" &&
                    event.args?.path === position.file &&
                    event.args?.pos === benchFn.getPos() &&
                    event.args?.end === benchFn.getEnd()
            )
            if (!benchCheckEvent) {
                throw new Error(
                    `Unable to type trace data for bench call at ${positionToString(
                        position
                    )}.`
                )
            }
            // TODO: Put this in its own function
            // dur timings are in microseconds, correct to our default of millis
            const ms = benchCheckEvent.dur / 1000
            const comparison = createMeasureComparison(ms, baseline)
            compareToBaseline(comparison, ctx)
            updateBaselineIfNeeded(
                stringifyMeasure(createMeasure(ms)),
                baseline,
                {
                    ...ctx,
                    kind: "type"
                }
            )
        }
    }
}
