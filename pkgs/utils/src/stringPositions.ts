import { getCaller } from "@re-do/node"

export type GetDelimitedPositionOptions = {
    delimiter?: string
}

export type LinePosition = {
    line: number
    column: number
}

export type SourcePosition = LinePosition & {
    file: string
}

export type SourceRange = { file: string; from: LinePosition; to: LinePosition }

// Translate 0-based absolute positions in contents to 1-based line/column pairs
export const getLinePositions = (
    contents: string,
    absolutePositions: number[],
    options: GetDelimitedPositionOptions = {}
) => translatePositions(contents, absolutePositions, options)

// Translate 1-based line/column pairs in contents to 0-based absolute positions
export const getAbsolutePositions = (
    contents: string,
    linePositions: LinePosition[],
    options: GetDelimitedPositionOptions = {}
) => translatePositions(contents, linePositions, options)

const translatePositions = <From extends number[] | LinePosition[]>(
    contents: string,
    positions: From,
    options: GetDelimitedPositionOptions
): From extends number[] ? LinePosition[] : number[] => {
    const toLines = typeof positions[0] === "number"
    const lines = contents.split(options?.delimiter ?? "\n")
    let currentPosition = 0
    let lineNumber = 1
    let result = Array(positions.length)
    const getRemaining = () => (positions as any[]).filter((_, i) => !result[i])

    while (getRemaining().length) {
        if (lineNumber > lines.length) {
            throw new Error(
                `Positions ${getRemaining()} exceed the length of contents.`
            )
        }
        // Add one to account for removed newline
        const lineLength = lines[lineNumber - 1].length + 1
        const nextPosition = currentPosition + lineLength
        let positionIndicesInLine: number[]
        if (toLines) {
            positionIndicesInLine = (positions as number[]).reduce(
                (result, pos, i) =>
                    currentPosition <= pos && pos < nextPosition
                        ? [...result, i]
                        : result,
                [] as number[]
            )
        } else {
            positionIndicesInLine = (positions as LinePosition[]).reduce(
                (result, { line }, i) =>
                    line === lineNumber ? [...result, i] : result,
                [] as number[]
            )
        }
        positionIndicesInLine.forEach((i) => {
            if (toLines) {
                result[i] = {
                    line: lineNumber,
                    column: (positions as number[])[i] - currentPosition + 1
                }
            } else {
                const column = (positions[i] as LinePosition).column
                if (column > lineLength) {
                    throw new Error(
                        `Column ${column} does not exist in line ${lineNumber}.`
                    )
                }
                result[i] = currentPosition + column - 1
            }
        })
        currentPosition = nextPosition
        lineNumber++
    }
    return result as any
}

export const calledFrom = (name?: string): SourcePosition => {
    const { file, line, char } = getCaller(
        name ?? getCaller("calledFrom").method
    )
    return {
        file,
        line,
        column: char
    }
}

export type Caller = ReturnType<typeof getCaller>
