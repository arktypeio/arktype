import { QueuedUpdate } from "../snapshot.js"
import { TimeAssertionName } from "./call.js"

export type BenchResult = {
    timestamp: string
    result: Record<TimeAssertionName | "type", any>
}
export type BenchHistory = {
    name: string
    results: BenchResult[]
}

let previousResults: any
let previousBenchName = ""
const timestamp = new Date().toDateString()
const createResultObject = ({
    baselineName,
    snapFunctionName,
    value
}: QueuedUpdate): BenchResult | undefined => {
    if (previousBenchName === baselineName) {
        if (snapFunctionName !== "mark") {
            previousResults.slice(-1)[0].result[snapFunctionName] = value
        } else {
            previousResults = {
                ...previousResults[0].result,
                ...value
            }
        }
        return
    } else {
        let result: Record<string, any> = {}
        if (snapFunctionName !== "mark") {
            result[snapFunctionName] = value
        } else {
            result = value
        }
        return {
            timestamp,
            result
        }
    }
}
const getMatchingBenchEntry = (benchName: string, benchData: BenchHistory[]) =>
    Object.entries(benchData).filter((entry) => entry[1].name === benchName)

export const appendBenchUpdate = (
    update: QueuedUpdate,
    benchData: BenchHistory[]
) => {
    if (update.snapFunctionName === "snap") {
        return
    }
    const currentResult = createResultObject(update)
    if (!currentResult) {
        return
    }
    const matchedEntries = getMatchingBenchEntry(
        update.baselineName!,
        benchData
    )
    previousBenchName = update.baselineName!
    if (matchedEntries.length) {
        matchedEntries[0][1].results.push(currentResult)
        previousResults = matchedEntries[0][1].results
    } else {
        benchData.push({
            name: update.baselineName!,
            results: [currentResult]
        })
        previousResults = benchData.slice(-1)[0].results
    }
}

const duplicateBenchNames: Record<string, boolean> = {}
export const logDuplicateNames = () =>
    Object.keys(duplicateBenchNames).forEach((name) =>
        console.error(`❌ duplicate bench name found: "${name}"`)
    )
export const findDuplicateBenchNames = (
    update: QueuedUpdate,
    queuedUpdates: QueuedUpdate[]
) => {
    if (
        duplicateBenchNames[update.baselineName!] ||
        !update.baselineName ||
        update.snapFunctionName === "snap"
    ) {
        return
    }
    const duplicates = queuedUpdates.filter(
        (_) =>
            _.baselineName === update.baselineName &&
            _.snapCall.getStartLineNumber() !==
                update.snapCall.getStartLineNumber()
    )
    if (duplicates.length) {
        duplicateBenchNames[update.baselineName!] = true
    }
}
