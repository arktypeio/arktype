import {
    fromPackageRoot,
    getCaller,
    mapFilesToContents,
    walkPaths
} from "@re-do/node"
import { memoize, stringify } from "@re-do/utils"
import { stdout } from "process"
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

// Line/column positions 1-based, absolute positions 0-based
export const translatePositions = <From extends number[] | LinePosition[]>(
    contents: string,
    positions: From,
    options?: GetDelimitedPositionOptions
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

export const createTsProgram = memoize(() => {
    stdout.write("Analyzing types..")
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
    stdout.write("✅\n")
    return {
        sources,
        program
    }
})

export const getErrors = memoize(() => {
    const { program, sources } = createTsProgram()
    stdout.write("Compiling type errors...")
    const diagnostics = program
        .getSemanticDiagnostics()
        .concat(program.getSyntacticDiagnostics())
    const errors = diagnostics.reduce(
        (errors, { file, start = 0, length = 1, messageText }) => {
            if (!file?.fileName || !sources[file.fileName]) {
                return errors
            }
            const [from, to] = translatePositions(sources[file.fileName], [
                start,
                start + length - 1
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
    stdout.write("✅\n")
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

export type AllContext<T> = {
    types: TypeContext
    value: T
    get: Omit<AllContext<T>, "get">
}

export const context = <T>(
    value: T,
    options: ContextOptions = {}
): AllContext<T> => {
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
                } else if (prop === "get") {
                    return {
                        value,
                        types
                    }
                }
            }
        }
    ) as any
}

export type CheckTypesOptions = {
    allowMultiple?: boolean
    includeNested?: boolean
    includeAny?: boolean
}

export const typeContext = (range: SourceRange) => {
    return {
        typeOf: getTypesInRange(range),
        errors: typeErrorsContext(range)
    }
}

export type TypeContext = ReturnType<typeof typeContext>

export const typeOf = (value: unknown, options: ContextOptions = {}) => {
    const from = options.from ?? calledFrom()
    return (typesOptions: CheckTypesOptions = {}) => {
        const to = options.to ?? calledFrom()
        return getTypesInRange({ file: from.file, from, to }, typesOptions)
    }
}

export const getTypesInRange = (
    { file, from, to }: SourceRange,
    options: CheckTypesOptions = {}
) => {
    const { program, sources } = createTsProgram()
    const checker = program.getTypeChecker()
    const [fromPos, toPos] = translatePositions(sources[file], [from, to])
    const findTypes = (node: ts.Node): string[] => {
        // For compatibility with 1-based positions
        const start = node.getStart()
        const end = node.getEnd() - 1
        const getNested = () =>
            node.getChildren().flatMap((child) => findTypes(child))

        const getType = () => {
            try {
                return checker.typeToString(checker.getTypeAtLocation(node))
            } catch (e) {
                return "any"
            }
        }
        if (start > toPos || end < fromPos) {
            return []
        }
        if (start >= fromPos && end <= toPos) {
            const nodeType = getType()
            if (nodeType !== "any" || options.includeAny) {
                return [nodeType, ...(options.includeNested ? getNested() : [])]
            }
            return getNested()
        } else {
            return getNested()
        }
    }
    const types = findTypes(program.getSourceFile(file)!)
    const baseTypeErrorMessage = () =>
        `Unable to identify the type in ${file} from ${from.line}:${from.column} to ${to.line}:${to.column}.`
    if (types.length === 0) {
        throw new Error(`${baseTypeErrorMessage()} No valid types found.`)
    }
    if (!options.allowMultiple && types.length > 1) {
        throw new Error(
            `${baseTypeErrorMessage()}. Found multiple top-level types:\n${stringify(
                types
            )}`
        )
    }
    return types[0]
}

export type TypeErrorsContextOptions = {}

export const typeErrorsContext =
    ({ file, from, to }: SourceRange) =>
    (options: TypeErrorsContextOptions = {}) => {
        const errorsInFile = getErrors()[file]
        const errorsAfterCall = errorsInFile.filter(
            (error) =>
                error.from.line > from.line ||
                (error.from.line === from.line &&
                    error.from.column >= from.column)
        )
        const errorsInContext = errorsAfterCall.filter(
            (error) =>
                error.to.line < to.line ||
                (error.to.line === to.line && error.to.column <= to.column)
        )
        return errorsInContext.map((_) => _.message)
    }

// assert(compile({ a: "string" }.types.a.type)).type()
// assert(compile({ a: "string" }.types.a.type)).type.errors()
// assert(compile({ a: "string" }.types.a.type)).value()
// assert(compile({ a: "string" }.types.a.type)).value.returns()
// assert(compile({ a: "string" }.types.a.type)).value.throws()
// check(compile({ a: "string" }.types.a.type)).type()
// check(compile({ a: "string" }.types.a.type)).type.errors()
// check(compile({ a: "string" }.types.a.type)).value()
// check(compile({ a: "string" }.types.a.type)).value.returns()
// check(compile({ a: "string" }.types.a.type)).value.throws()
