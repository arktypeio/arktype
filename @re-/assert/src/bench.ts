import { performance } from "node:perf_hooks"
import { caller } from "@re-/node"
import { CallExpression, SyntaxKind, ts } from "ts-morph"
import { getReAssertConfig } from "./common.js"
import { getTsProject } from "./type/analysis.js"
import { writeInlineSnapshotToFile } from "./value/snapshot.js"

export type LoopOptions = {
    ms?: number
    count?: number
}

export const bench = (
    name: string,
    functionToTest: () => void,
    options: LoopOptions = {}
) => {
    getTsProject()
    const config = getReAssertConfig()
    const position = caller()
    const results: number[] = []
    const benchStart = performance.now()
    // const project = getTsProject()
    // const file = project.getSourceFile(position.file)
    // if (!file) {
    //     throw new Error(`No type information available for '${position.file}'.`)
    // }
    // const startNode = file.getDescendantAtPos(
    //     ts.getPositionOfLineAndCharacter(
    //         file.compilerNode,
    //         // TS uses 0-based line and char #s
    //         position.line - 1,
    //         position.char - 1
    //     )
    // )
    // const benchCall = startNode
    //     ?.getAncestors()
    //     .find(
    //         (ancestor) =>
    //             ancestor.getKind() === SyntaxKind.CallExpression &&
    //             ancestor
    //                 .asKind(SyntaxKind.CallExpression)
    //                 ?.getFirstChildByKind(SyntaxKind.Identifier)
    //                 ?.getText() === "bench"
    //     ) as CallExpression
    // if (!benchCall) {
    //     throw new Error("hi")
    // }
    const shouldContinue = () => {
        const elapsed = performance.now() - benchStart
        if (
            (options.count && results.length >= options.count) ||
            (options.ms && elapsed >= options.ms)
        ) {
            // If either option was passed directly and the condition has been met, stop looping
            return false
        }
        // Else, default to a relatively conservative standard
        return (results.length < 1_000_000 || elapsed < 1000) && elapsed < 5000
    }
    while (shouldContinue()) {
        const invocationStart = performance.now()
        functionToTest()
        results.push(performance.now() - invocationStart)
    }
    const totalCallTime = results.reduce((sum, duration) => sum + duration, 0)
    const avgCallTime = Number((totalCallTime / results.length).toPrecision(3))
    return {
        mark: (baseline?: number) => {
            console.group(`${name}:`)
            console.log(`🏌️ Millis/call: ${avgCallTime}`)
            if (baseline && !config.updateSnapshots) {
                console.log(`⛳ Baseline: ${baseline}`)
                const delta = (100 * (avgCallTime - baseline)) / baseline
                const formattedDelta = `${delta.toPrecision(3)}%`
                if (delta > 10) {
                    console.error(
                        `📈 ${name} exceeded baseline by ${formattedDelta} (treshold is 10%).`
                    )
                    process.exitCode = 1
                } else if (delta < -10) {
                    console.log(
                        // Remove the leading negative when formatting our delta
                        `📉 ${name} was under baseline by ${formattedDelta.slice(
                            1
                        )}! Consider setting a new baseline.`
                    )
                } else {
                    console.log(
                        `📊 Delta: ${delta > 0 ? "+" : ""}${formattedDelta}`
                    )
                }
            } else {
                console.log(`Writing your new baseline...`)
                writeInlineSnapshotToFile({
                    position,
                    serializedValue: String(avgCallTime),
                    snapFunctionName: "mark"
                })
            }
            console.groupEnd()
        }
    }
}
