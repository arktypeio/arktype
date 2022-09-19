import { relative } from "node:path"
import { fromCwd } from "@re-/node"
import type { QueuedUpdate } from "../snapshot.js"

export type BenchResult = {
    timestamp: string
    result: Record<string, any>
}
export type BenchHistory = {
    name: string
    file: string
    results: BenchResult[]
}

const timestamp = new Date().toLocaleString()
export const upsertBenchResult = (
    { baselineName, snapFunctionName, position, newArgText }: BenchUpdate,
    benchData: BenchHistory[]
) => {
    const file = relative(fromCwd(), position.file)
    const matchingBenchHistory = benchData.find(
        (data) => data.name === baselineName && data.file === file
    )
    // TODO: Improve bench history format: https://github.com/re-do/re-po/issues/459
    const currentResult = {
        timestamp,
        result: { [snapFunctionName]: newArgText }
    }
    if (matchingBenchHistory) {
        updateExistingBenchResult(matchingBenchHistory, currentResult)
    } else {
        benchData.push({
            name: baselineName,
            file,
            results: [currentResult]
        })
    }
}
const updateExistingBenchResult = (
    matchingBenchHistory: BenchHistory,
    currentResult: BenchResult
) => {
    if (
        timestamp ===
        matchingBenchHistory.results[matchingBenchHistory.results.length - 1]
            .timestamp
    ) {
        Object.assign(
            matchingBenchHistory.results[
                matchingBenchHistory.results.length - 1
            ].result,
            currentResult
        )
    } else {
        matchingBenchHistory.results.push({
            timestamp,
            result: currentResult
        })
    }
}
type BenchUpdate = QueuedUpdate & { baselineName: string }
export const updateIsBench = (update: QueuedUpdate): update is BenchUpdate =>
    update.baselineName !== undefined

export const assertNoDuplicateBenchNames = (queuedUpdates: QueuedUpdate[]) => {
    const duplicatedNames: string[] = []
    const benchNamesToLineAppearances: Record<string, number[]> = {}
    for (const update of queuedUpdates) {
        const name = update.baselineName
        if (!name) {
            return
        }
        //snapCall refers to the entire bench call so chained snap calls result in the same line number
        const benchCallLine = update.snapCall.getStartLineNumber()
        if (name in benchNamesToLineAppearances) {
            if (!benchNamesToLineAppearances[name].includes(benchCallLine)) {
                if (!duplicatedNames.includes(name)) {
                    duplicatedNames.push(name)
                }
                benchNamesToLineAppearances[name].push(benchCallLine)
            }
        } else {
            benchNamesToLineAppearances[name] = [benchCallLine]
        }
    }

    if (duplicatedNames.length) {
        const duplicateBenchNamesMessage = duplicatedNames.reduce(
            (message, name) => {
                return `${message}\n ${name} found on lines: ${benchNamesToLineAppearances[
                    name
                ].join(",")}`
            },
            `❌ duplicate bench names found in file ${queuedUpdates[0].position.file}:`
        )
        throw new Error(duplicateBenchNamesMessage)
    }
}
