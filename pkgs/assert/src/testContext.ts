import {
    findPackageRoot,
    fromPackageRoot,
    mapFilesToContents,
    walkPaths,
    withCallRange
} from "@re-do/node"
import {
    memoize,
    stringify,
    LinePosition,
    getLinePositions,
    getAbsolutePositions,
    caller,
    SourcePosition,
    SourceRange,
    partial,
    Func
} from "@re-do/utils"
import { join } from "path"
import { stdout } from "process"
import ts from "typescript"

type TypeError = {
    from: LinePosition
    to: LinePosition
    message: string
}

// Maps fileNames to a list objects representing errors
type ErrorsByFile = Record<string, TypeError[]>

export const createTsProgram = memoize(() => {
    stdout.write("Analyzing types..")
    const packageRoot = findPackageRoot(process.cwd())
    const options = ts.parseJsonSourceFileConfigFileContent(
        ts.readJsonConfigFile(
            join(packageRoot, "tsconfig.json"),
            ts.sys.readFile
        ),
        ts.sys,
        process.cwd()
    ).options
    const rootNames = walkPaths(join(packageRoot, "src", "__tests__"), {
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
            const [from, to] = getLinePositions(sources[file.fileName], [
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

export type ContextOptions = {
    from?: SourcePosition
    to?: SourcePosition
}

export type AllContext<T> = {
    types: TypeContext
    value: T
    get: Omit<AllContext<T>, "get">
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

export const check = withCallRange((range: SourceRange, value: unknown) => {
    const getType = partial(getTypesInRange, range)
    const getValue = () => value
    return {
        type: Object.assign(getType, {
            error: partial(typeErrorsContext, range)
        }),
        value: Object.assign(getValue, {
            throws: () => {
                if (typeof value !== "function") {
                    throw new Error(
                        `throws() can only be checked for functions.`
                    )
                }
                try {
                    value()
                } catch (e) {
                    return String(e)
                }
            }
        })
    }
})

export type TypeContext = ReturnType<typeof typeContext>

export const typeOf = (value: unknown, options: ContextOptions = {}) => {
    const from = options.from ?? caller()
    return (typesOptions: CheckTypesOptions = {}) => {
        const to = options.to ?? caller()
        return getTypesInRange({ file: from.file, from, to }, typesOptions)
    }
}

export const getTypesInRange = (
    { file, from, to }: SourceRange,
    options: CheckTypesOptions = {}
) => {
    const { program, sources } = createTsProgram()
    const checker = program.getTypeChecker()
    const [fromPos, toPos] = getAbsolutePositions(sources[file], [from, to])
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

export const typeErrorsContext = (
    { file, from, to }: SourceRange,
    options: TypeErrorsContextOptions = {}
) => {
    const errorsInFile = getErrors()[file]
    const errorsAfterCall = errorsInFile.filter(
        (error) =>
            error.from.line > from.line ||
            (error.from.line === from.line && error.from.column >= from.column)
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
