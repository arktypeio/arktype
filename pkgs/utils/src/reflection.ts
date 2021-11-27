import getCurrentLine from "get-current-line"
import { LinePosition } from "./stringPositions.js"

export type SourcePosition = LinePosition & {
    file: string
    method: string
}

export type SourceRange = { file: string; from: LinePosition; to: LinePosition }

export const callerOf = (relativeToMethod?: string): SourcePosition => {
    const { file, line, char, method } = getCurrentLine({
        method: relativeToMethod ?? callerOf("callerOf").method,
        frames: 0,
        immediate: false
    })
    return {
        file,
        line,
        column: char,
        method
    }
}
