import { literalSerialize } from "../common.js"
import { queueInlineSnapshotWriteOnProcessExit } from "../value/snapshot.js"
import { BenchAssertionContext, BenchContext } from "./bench.js"
import { MeasureComparison } from "./measure.js"

export const updateBaselineIfNeeded = (
    result: string | object,
    baseline: string | object | undefined,
    ctx: BenchAssertionContext
) => {
    // If we already have a baseline and the user didn't pass an update flag, do nothing
    if (baseline && !ctx.config.updateSnapshots) {
        return
    }
    const serializedValue = literalSerialize(result)
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
    { result, baseline }: MeasureComparison,
    { name, config }: BenchContext
) => {
    console.log(`🏌️ Result: ${result.n.toFixed(2)}${result.unit}`)
    if (baseline && !config.updateSnapshots) {
        console.log(`⛳ Baseline: ${baseline.n.toFixed(2)}${baseline.unit}`)
        const delta = ((result.n - baseline.n) / baseline.n) * 100
        const formattedDelta = `${delta.toFixed(2)}%`
        if (delta > config.benchPercentThreshold) {
            const message = `'${name}' exceeded baseline by ${formattedDelta} (treshold is ${config.benchPercentThreshold}%).`
            console.error(`📈 ${message}`)
            if (config.benchErrorOnThresholdExceeded) {
                process.exitCode = 1
                // Summarize failures at the end of output
                process.on("exit", () => {
                    console.error(`❌ ${message}`)
                })
            }
        } else if (delta < -config.benchPercentThreshold) {
            console.log(
                // Remove the leading negative when formatting our delta
                `📉 ${name} was under baseline by ${formattedDelta.slice(
                    1
                )}! Consider setting a new baseline.`
            )
        } else {
            console.log(`📊 Delta: ${delta > 0 ? "+" : ""}${formattedDelta}`)
        }
    }
}
