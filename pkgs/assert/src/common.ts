export type LinePosition = {
    line: number
    char: number
}

export type SourcePosition = LinePosition & {
    file: string
    method: string
}

export const writeJsonSync = (path: string, data: unknown) => {
    Deno.writeTextFileSync(path, JSON.stringify(data, null, 4))
}

export const readJsonSync = (path: string) => {
    try {
        return JSON.parse(Deno.readTextFileSync(path))
    } catch {
        return undefined
    }
}
