import type { QueuedUpdate } from "../snapshot.js"
import type { TimeUnit } from "./measure/time.js"
import type { TypeUnit } from "./measure/types.js"

type MarkData = Record<string, BenchStatTuple>

export type BenchResult = {
    date: string
    mark: MarkData
}

export type BenchStatTuple = [number, TimeUnit | TypeUnit]

export type BenchData = { [K in string]: BenchData | BenchResult[] }

const date = new Date().toLocaleDateString()

const toMarkData = ({
    snapFunctionName,
    newArgText
}: BenchUpdate): MarkData => {
    if (snapFunctionName === "mark") {
        return JSON.parse(newArgText)
    }
    return {
        [snapFunctionName]: JSON.parse(newArgText)
    }
}

export const upsertBenchResult = (
    benchUpdate: BenchUpdate,
    rootBenchData: BenchData
) => {
    let matchingData = rootBenchData
    const remainingSegments = [...benchUpdate.baselinePath]
    const fullPathName = benchUpdate.baselinePath.join("/")
    while (remainingSegments.length) {
        if (Array.isArray(matchingData)) {
            throw new Error(
                `Bench data already exists at prefix path of ${fullPathName}.`
            )
        }
        const head = remainingSegments.shift()!
        if (!(head in matchingData)) {
            matchingData[head] = remainingSegments.length ? {} : []
        }
        matchingData = matchingData[head] as BenchData
    }
    if (!Array.isArray(matchingData)) {
        throw new Error(
            `Expected a list of bench history results at ${fullPathName}.`
        )
    }
    addResultToMatchingData(benchUpdate, matchingData)
}

export const addResultToMatchingData = (
    benchUpdate: BenchUpdate,
    matchingResults: BenchResult[]
) => {
    const mark = toMarkData(benchUpdate)
    const latestResult = matchingResults[0] as BenchResult | undefined
    if (
        latestResult?.date === date &&
        !(benchUpdate.snapFunctionName in latestResult.mark) &&
        benchUpdate.snapFunctionName !== "mark"
    ) {
        latestResult.mark = { ...latestResult.mark, ...mark }
    } else {
        const newResult: BenchResult = { date, mark }
        matchingResults.unshift(newResult)
    }
}

type BenchUpdate = QueuedUpdate & { baselinePath: string[] }

export const updateIsBench = (update: QueuedUpdate): update is BenchUpdate =>
    !!update.baselinePath
