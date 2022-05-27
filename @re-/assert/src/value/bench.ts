import { performance, PerformanceObserver } from "node:perf_hooks"

export type BenchOptions = {
    ms?: number
    loops?: number
}

export const bench = async (
    benchFunction: () => void | Promise<void>,
    options: BenchOptions = {}
) => {
    // const timedBenchFunction = performance.timerify(benchFunction)
    // const result = new Promise((resolve) => {
    //     const performanceObserver = new PerformanceObserver(
    //         (list, observer) => {
    //             observer.disconnect()
    //             const entries = list.getEntries()
    //             const totalCallTime = entries.reduce(
    //                 (sum, { duration }) => sum + duration,
    //                 0
    //             )
    //             const averageCallTime = totalCallTime / entries.length
    //             resolve(averageCallTime)
    //         }
    //     )
    //     performanceObserver.observe({
    //         type: "function",
    //         buffered: true
    //     })
    // })
    const results: number[] = []
    const benchStart = performance.now()
    const shouldLoop = () => {
        const elapsed = performance.now() - benchStart
        if (
            (options.loops && results.length >= options.loops) ||
            (options.ms && elapsed >= options.ms)
        ) {
            // If either option was passed directly and the condition has been met, stop looping
            return false
        }
        // Else, default to checking for either 5 seconds elapsed or 1,000,000 iterations
        return results.length < 1_000_000 && elapsed < 5000
    }
    while (shouldLoop()) {
        const invocationStart = performance.now()
        await benchFunction()
        results.push(performance.now() - invocationStart)
    }
    const totalCallTime = results.reduce((sum, duration) => sum + duration, 0)
    return totalCallTime / results.length
}
