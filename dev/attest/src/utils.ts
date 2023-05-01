import { relative } from "node:path"
import { ts } from "ts-morph"

export type LinePosition = {
    line: number
    char: number
}

export type LinePositionRange = {
    start: LinePosition
    end: LinePosition
}

export type SourcePosition = LinePosition & {
    file: string
    method: string
}

export const positionToString = (position: SourcePosition) =>
    `line ${position.line}, character ${position.char} at path '${position.file}'`

export const getFileKey = (path: string) => relative(".", path)

export const getTsVersionUnderTest = () => ts.versionMajorMinor
