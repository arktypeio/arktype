import { literalSerialize } from "../common.js"
import { queueInlineSnapshotWriteOnProcessExit } from "../value/snapshot.js"
import { BenchAssertionContext, BenchContext } from "./bench.js"
import { MeasureComparison, stringifyMeasure } from "./measure/index.js"

export const queueBaselineUpdateIfNeeded = (
    updated: string | object,
    baseline: string | object | undefined,
    ctx: BenchAssertionContext
) => {
    // If we already have a baseline and the user didn't pass an update flag, do nothing
    if (baseline && !ctx.cfg.updateSnapshots) {
        return
    }
    const serializedValue = literalSerialize(updated)
    if (!ctx.lastSnapCallPosition) {
        throw new Error(
            `Unable to update baseline for ${ctx.name} ('lastSnapCallPosition' was unset).`
        )
    }
    queueInlineSnapshotWriteOnProcessExit({
        position: ctx.lastSnapCallPosition,
        serializedValue,
        snapFunctionName: ctx.kind,
        baselineName: ctx.name
    })
}

/** Pretty print comparison and set the process.exitCode to 1 if delta threshold is exceeded */
export const compareToBaseline = (
    result: MeasureComparison,
    ctx: BenchContext
) => {
    console.log(`🏌️ Result: ${stringifyMeasure(result.updated)}`)
    if (result.baseline && !ctx.cfg.updateSnapshots) {
        console.log(`⛳ Baseline: ${stringifyMeasure(result.baseline)}`)
        const delta =
            ((result.updated.n - result.baseline.n) / result.baseline.n) * 100
        const formattedDelta = `${delta.toFixed(2)}%`
        if (delta > ctx.cfg.benchPercentThreshold) {
            handlePositiveDelta(formattedDelta, ctx)
        } else if (delta < -ctx.cfg.benchPercentThreshold) {
            handleNegativeDelta(formattedDelta, ctx)
        } else {
            console.log(`📊 Delta: ${delta > 0 ? "+" : ""}${formattedDelta}`)
        }
    }
}

const handlePositiveDelta = (formattedDelta: string, ctx: BenchContext) => {
    const message = `'${ctx.name}' exceeded baseline by ${formattedDelta} (treshold is ${ctx.cfg.benchPercentThreshold}%).`
    console.error(`📈 ${message}`)
    if (ctx.cfg.benchErrorOnThresholdExceeded) {
        process.exitCode = 1
        // Summarize failures at the end of output
        process.on("exit", () => {
            console.error(`❌ ${message}`)
        })
    }
}

const handleNegativeDelta = (formattedDelta: string, ctx: BenchContext) => {
    console.log(
        // Remove the leading negative when formatting our delta
        `📉 ${ctx.name} was under baseline by ${formattedDelta.slice(
            1
        )}! Consider setting a new baseline.`
    )
}
