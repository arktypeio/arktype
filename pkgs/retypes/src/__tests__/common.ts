import {
    dirName,
    fromPackageRoot,
    getCaller,
    mapFilesToContents,
    readFile,
    walkPaths
} from "@re-do/node"
import { memoize, stringify, transform } from "@re-do/utils"
import { readFileSync } from "fs"
import { stdout } from "process"
import ts from "typescript"

// Maps fileNames to a list objects representing errors
type TypeErrors = Record<
    string,
    {
        range: [[number, number], [number, number]]
        message: string
    }[]
>

export type GetDelimitedPositionOptions = {
    delimiter?: string
}

export const getDelimitedPositions = (
    contents: string,
    positions: number[],
    options?: GetDelimitedPositionOptions
) => {
    const lines = contents.split(options?.delimiter ?? "\n")
    let currentPosition = 0
    let groupNumber = 0
    let remaining = [...positions]
    let result: Record<number, [number, number]> = {}
    while (remaining.length) {
        if (groupNumber > lines.length - 1) {
            throw new Error(
                `Some of positions ${stringify(
                    positions
                )} do not exist in contents.`
            )
        }
        const nextPosition = currentPosition + lines[groupNumber].length
        const matchingPositions = positions.filter(
            (pos) => currentPosition <= pos && pos < nextPosition
        )
        remaining = remaining.filter((pos) => !matchingPositions.includes(pos))
        matchingPositions.forEach((pos) => {
            result[pos] = [groupNumber, pos - currentPosition]
        })
        currentPosition = nextPosition
        groupNumber++
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
    console.log(stringify(rootNames))
    const sources = mapFilesToContents(rootNames)
    const program = ts.createProgram({
        rootNames,
        options
    })

    const diagnostics = program
        .getSemanticDiagnostics()
        .concat(program.getSyntacticDiagnostics())
    const errors = diagnostics.reduce(
        (errors, { file, start = 0, length = 0, messageText }) => {
            if (!file?.fileName || !rootNames.includes(file.fileName)) {
                return errors
            }
            console.log(file.fileName)
            const { [start]: startPos, [start + length - 1]: endPos } =
                getDelimitedPositions(sources[file.fileName], [
                    start,
                    start + length - 1
                ])
            return {
                ...errors,
                [file.fileName]: (errors[file.fileName] ?? []).concat({
                    range: [startPos, endPos],
                    message:
                        typeof messageText === "string"
                            ? messageText
                            : messageText.messageText
                })
            }
        },
        {} as TypeErrors
    )
    console.log("✅\n")
    return errors
})

export const getErrors = (...args: any[]) => {
    const caller = getCaller("getErrors")
}

// export const getNextType = () => {
//     const caller = getCaller("getNextType")
//     const diagnostics: Diagnostic[] = tsdData
//     let nextDiagnostic: Diagnostic | undefined = undefined
//     for (const d of diagnostics) {
//         const line = d.line ?? -1
//         if (caller.file.endsWith(d.fileName) && line >= caller.line) {
//             if (
//                 !(nextDiagnostic && nextDiagnostic.line) ||
//                 line < nextDiagnostic.line
//             ) {
//                 nextDiagnostic = d
//             }
//         }
//     }
//     if (!nextDiagnostic) {
//         throw new Error(
//             `No next type found from ${caller.file} at line ${caller.line}.`
//         )
//     }
//     return nextDiagnostic
// }
