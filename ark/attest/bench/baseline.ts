import { snapshot } from "@ark/util"
import { AssertionError } from "node:assert"
import process from "node:process"
import {
	queueSnapshotUpdate,
	writeSnapshotUpdatesOnExit
} from "../cache/snapshots.ts"
import type { BenchContext } from "./bench.ts"
import {
	stringifyMeasure,
	type MarkMeasure,
	type Measure,
	type MeasureComparison
} from "./measure.ts"

export const queueBaselineUpdateIfNeeded = (
	updated: Measure | MarkMeasure,
	baseline: Measure | MarkMeasure | undefined,
	ctx: BenchContext
): void => {
	// If we already have a baseline and the user didn't pass an update flag, do nothing
	if (baseline && !ctx.cfg.updateSnapshots) return

	const serializedValue = snapshot(updated)
	if (!ctx.lastSnapCallPosition) {
		throw new Error(
			`Unable to update baseline for ${ctx.qualifiedName} ('lastSnapCallPosition' was unset).`
		)
	}
	queueSnapshotUpdate({
		position: ctx.lastSnapCallPosition,
		serializedValue,
		snapFunctionName: ctx.kind,
		baselinePath: ctx.qualifiedPath
	})

	if (ctx.kind === "types") writeSnapshotUpdatesOnExit()
}

/** Pretty print comparison and set the process.exitCode to 1 if delta threshold is exceeded */
export const compareToBaseline = (
	result: MeasureComparison,
	ctx: BenchContext
): void => {
	console.log(`⛳ Result: ${stringifyMeasure(result.updated)}`)
	if (result.baseline && !ctx.cfg.updateSnapshots) {
		console.log(`🎯 Baseline: ${stringifyMeasure(result.baseline)}`)
		const delta =
			((result.updated[0] - result.baseline[0]) / result.baseline[0]) * 100
		const formattedDelta = `${delta.toFixed(2)}%`
		if (delta > ctx.cfg.benchPercentThreshold)
			handlePositiveDelta(formattedDelta, ctx)
		else if (delta < -ctx.cfg.benchPercentThreshold)
			handleNegativeDelta(formattedDelta, ctx)
		else console.log(`📊 Delta: ${delta > 0 ? "+" : ""}${formattedDelta}`)
		// add an extra newline
		console.log()
	}
}

const handlePositiveDelta = (formattedDelta: string, ctx: BenchContext) => {
	const message = `'${ctx.qualifiedName}' exceeded baseline by ${formattedDelta} (threshold is ${ctx.cfg.benchPercentThreshold}%).`
	console.error(`📈 ${message}`)
	if (ctx.cfg.benchErrorOnThresholdExceeded) {
		const errorSummary = `❌ ${message}`
		if (ctx.kind === "instantiations")
			throw new AssertionError({ message: errorSummary })
		else {
			process.exitCode = 1
			// Summarize failures at the end of output
			process.on("exit", () => {
				console.error(errorSummary)
			})
		}
	}
}

const handleNegativeDelta = (formattedDelta: string, ctx: BenchContext) => {
	console.log(
		// Remove the leading negative when formatting our delta
		`📉 ${ctx.qualifiedName} was under baseline by ${formattedDelta.slice(
			1
		)}! Consider setting a new baseline.`
	)
}
