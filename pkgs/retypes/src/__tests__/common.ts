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

export type TypeErrorsOptions = {
    asList?: boolean
    includePositions?: boolean
}

export const types = (...args: any[]) => {
    const caller = getCaller("types")
    const errorsInFile = validateTypes()[caller.file]
    const errorsAfterCall = errorsInFile.filter(
        (error) =>
            error.from.line > caller.line ||
            (error.from.line === caller.line &&
                error.from.column >= caller.char)
    )
    const errors = (options?: TypeErrorsOptions) => {
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
    return { errors }
    // const errorsInFile = validateTypes()[caller.file]
    // for (const error of errorsInFile) {
    //     if (error.from.line >= caller.line) {
    //         if (!nextError || error.from.line < nextError.from.line) {
    //             nextError = error
    //         }
    //     }
    // }
    // if (!nextError) {
    //     throw new Error(
    //         `No next type found from ${caller.file} at line ${caller.line}.`
    //     )
    // }
    // return nextError
}
