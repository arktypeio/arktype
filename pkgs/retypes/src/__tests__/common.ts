import {
    fromPackageRoot,
    getCaller,
    mapFilesToContents,
    walkPaths
} from "@re-do/node"
import { memoize, stringify, transform } from "@re-do/utils"
import ts from "typescript"

type TypeError = {
    from: LinePosition
    to: LinePosition
    message: string
}

// Maps fileNames to a list objects representing errors
type ErrorsByFile = Record<string, TypeError[]>

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

// Parameter and return positions are 1-based
export const getLinePositions = (
    contents: string,
    positions: number[],
    options?: GetDelimitedPositionOptions
) => {
    const lines = contents.split(options?.delimiter ?? "\n")
    let currentPosition = 1
    let lineNumber = 1
    let remaining = [...positions]
    let result: LinePosition[] = Array(positions.length)
    while (remaining.length) {
        if (lineNumber > lines.length) {
            throw new Error(
                `Positions ${stringify(remaining)} do not exist in contents.`
            )
        }
        // Add one to account for removed newline
        const nextPosition = currentPosition + lines[lineNumber - 1].length + 1
        const positionIndicesInLine = positions.reduce(
            (result, pos, i) =>
                currentPosition <= pos && pos < nextPosition
                    ? [...result, i]
                    : result,
            [] as number[]
        )
        remaining = remaining.filter(
            (pos, i) => !positionIndicesInLine.includes(i)
        )
        positionIndicesInLine.forEach((i) => {
            result[i] = {
                line: lineNumber,
                column: positions[i] - currentPosition + 1
            }
        })
        currentPosition = nextPosition
        lineNumber++
    }
    return result
}

export const validateTypes = memoize(() => {
    console.log("Validating types...")
    const options = ts.parseJsonSourceFileConfigFileContent(
        ts.readJsonConfigFile(
            fromPackageRoot("tsconfig.json"),
            ts.sys.readFile
        ),
        ts.sys,
        process.cwd()
    ).options
    const rootNames = walkPaths(fromPackageRoot("src", "__tests__"), {
        excludeDirs: true
    })
    const sources = mapFilesToContents(rootNames)
    const program = ts.createProgram({
        rootNames,
        options
    })

    const diagnostics = program
        .getSemanticDiagnostics()
        .concat(program.getSyntacticDiagnostics())
    const errors = diagnostics.reduce(
        (errors, { file, start = 0, length = 1, messageText }) => {
            if (!file?.fileName || !rootNames.includes(file.fileName)) {
                return errors
            }
            // Convert to 1-based positions for getLinePositions
            const [from, to] = getLinePositions(sources[file.fileName], [
                start + 1,
                start + length
            ])
            return {
                ...errors,
                [file.fileName]: (errors[file.fileName] ?? []).concat({
                    from,
                    to,
                    message:
                        typeof messageText === "string"
                            ? messageText
                            : messageText.messageText
                })
            }
        },
        {} as ErrorsByFile
    )
    console.log("✅\n")
    return errors
})

export const assert = (value: unknown) => {
    const from = calledFrom()
    const ctx = context(value, { from })
    return ctx
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

export type ContextOptions = {
    from?: SourcePosition
    to?: SourcePosition
}

export type AllContext = {
    types: TypeContext
    value: ValueContext
    all: Omit<AllContext, "all">
}

export const context = (
    value: unknown,
    options: ContextOptions = {}
): AllContext => {
    const from = options.from ?? calledFrom()
    return new Proxy(
        {},
        {
            get: (_, prop) => {
                const types = typeContext({
                    file: from.file,
                    from,
                    to: options.to ?? calledFrom()
                })
                if (prop === "types") {
                    return types
                } else if (prop === "value") {
                    return value
                } else if (prop === "all") {
                    return {
                        value,
                        types
                    }
                }
            }
        }
    ) as any
}

export const valueContext = (value: unknown) => {
    return {
        value
    }
}

export type ValueContext = unknown //ReturnType<typeof valueContext>

export const typeContext = (range: SourceRange) => {
    return {
        errors: typeErrorsContext(range)
    }
}

export type TypeContext = ReturnType<typeof typeContext>

export type TypeErrorsContextOptions = {
    asList?: boolean
    includePositions?: boolean
}

export const typeErrorsContext =
    ({ file, from }: SourceRange) =>
    (options?: TypeErrorsContextOptions) => {
        const errorsInFile = validateTypes()[file]
        const errorsAfterCall = errorsInFile.filter(
            (error) =>
                error.from.line > from.line ||
                (error.from.line === from.line &&
                    error.from.column >= from.column)
        )
        const errorsCaller = getCaller("errors")
        const errorsInContext = errorsAfterCall.filter(
            (error) =>
                error.to.line < errorsCaller.line ||
                (error.to.line === errorsCaller.line &&
                    error.to.column <= errorsCaller.char)
        )
        const result = options?.includePositions
            ? errorsInContext
            : errorsInContext.map((_) => _.message)
        return options?.asList ? result : result.join(", ")
    }
