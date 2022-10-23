import { toString } from "@arktype/tools"
// @ts-ignore
import ConvertSourceMap from "convert-source-map"
import { SourceMapConsumer } from "source-map-js"
import type { SourcePosition } from "./common.js"

export const isVitest = () => "__vitest_worker__" in globalThis

/**
 * Currently, Vitest uses some interal code similar to this to rewrite stack traces,
 * but only if an error bubbles to the test level. We just create a stack trace to get the
 * caller position, so the stack is never rewritten based on sourcemaps and breaks
 * reassert's type assertion locations.
 *
 * To work around this, we use a couple utilities and the data from the Vitest worker global
 * to map the position ourselves.
 */
export const fixVitestPos = (transformedPos: SourcePosition) => {
    const transformedFileContents = (
        globalThis as any
    ).__vitest_worker__.moduleCache.get(transformedPos.file).code
    const jsonSourceMap = ConvertSourceMap.fromSource(transformedFileContents)
        .setProperty("sources", [transformedPos.file])
        .toJSON()
    const mapper = new SourceMapConsumer(jsonSourceMap)
    const originalPos = mapper.originalPositionFor({
        line: transformedPos.line,
        column: transformedPos.char
    })
    if (originalPos.line === null || originalPos.column === null) {
        throw new Error(
            `Unable to determine vitest sourcemap for ${toString(
                transformedPos
            )}.`
        )
    }
    return {
        ...transformedPos,
        line: originalPos.line,
        char: originalPos.column + 1
    }
}
