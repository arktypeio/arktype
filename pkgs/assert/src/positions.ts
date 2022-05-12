export type LinePosition = {
    line: number
    column: number
}

export type SourcePosition = LinePosition & {
    file: string
    method: string
}
