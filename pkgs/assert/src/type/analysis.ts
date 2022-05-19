import { readJson, writeJson } from "@re-/node"
import { rmSync } from "fs"
import { Project, SourceFile, SyntaxKind, ts, Type } from "ts-morph"
import {
    SourcePosition,
    LinePosition,
    getReAssertConfig,
    Memoized
} from "../common.js"
import { writeQueuedSnapshotUpdates } from "../value/index.js"
import { getAssertFilePath } from "../assert.js"
import { dirname, join, relative } from "node:path"

export const cacheTypeAssertions = () => {
    const config = getReAssertConfig()
    if (!config.precached) {
        throw new Error(
            `You must set 'precached' to true in the 'assert' section ` +
                ` of your re.json config to enable precaching.`
        )
    }
    writeJson(
        config.precachePath,
        analyzeTypeAssertions({ isInitialCache: true })
    )
}

export const cleanupTypeAssertionCache = () => {
    const config = getReAssertConfig()
    writeQueuedSnapshotUpdates(config.precachePath)
    rmSync(config.precachePath, { recursive: true })
}

export const getTsProject: Memoized<() => Project> = () => {
    if (!getTsProject.cache) {
        const config = getReAssertConfig()
        const tsConfigFilePath = config.tsconfig ? config.tsconfig : undefined
        const project = new Project({
            tsConfigFilePath
        })
        if (!tsConfigFilePath) {
            project.addSourceFilesAtPaths(["**"])
        }
        getTsProject.cache = project
    }
    return getTsProject.cache
}

type LinePositionRange = {
    start: LinePosition
    end: LinePosition
}

type AssertionData = {
    location: LinePositionRange
    type: {
        actual: string
        expected?: string
    }
    errors: string
}

type DiagnosticData = {
    start: number
    end: number
    message: string
}

type AssertionsByFile = Record<string, AssertionData[]>

type DiagnosticsByFile = Record<string, DiagnosticData[]>

const concatenateChainedErrors = (
    diagnostics: ts.DiagnosticMessageChain[]
): string =>
    diagnostics
        .map(
            (msg) =>
                `${msg.messageText}${
                    msg.next ? concatenateChainedErrors(msg.next) : ""
                }`
        )
        .join("\n")

const getFileKey = (path: string) => relative(".", path)

type AnalyzeTypeAssertionsOptions = {
    isInitialCache?: boolean
}

/** Mutates the module-level assertionsByFile variable */
const analyzeTypeAssertions: Memoized<
    (options?: AnalyzeTypeAssertionsOptions) => AssertionsByFile
> = ({ isInitialCache } = {}) => {
    if (analyzeTypeAssertions.cache) {
        return analyzeTypeAssertions.cache
    }
    const config = getReAssertConfig()
    if (config.precached && !isInitialCache) {
        analyzeTypeAssertions.cache = readJson(config.precachePath)
        if (!analyzeTypeAssertions.cache) {
            throw new Error(
                `Unable to find precached assertion data at '${config.precachePath}'. ` +
                    `Did you forget to call 'cacheTypeAssertions' before running your tests?`
            )
        }
        return analyzeTypeAssertions.cache
    }
    const project = getTsProject()
    const assertionsByFile: AssertionsByFile = {}
    const diagnosticsByFile: DiagnosticsByFile = {}

    // We have to use this internal checker to access errors ignore by @ts-ignore or @ts-expect-error
    const tsProgram = project.getProgram().compilerObject as any
    const diagnostics: ts.Diagnostic[] = tsProgram
        .getDiagnosticsProducingTypeChecker()
        .getDiagnostics()
    diagnostics.forEach((diagnostic) => {
        const filePath = diagnostic.file?.fileName
        if (!filePath) {
            return
        }
        const fileKey = getFileKey(filePath)
        const start = diagnostic.start ?? -1
        const end = start + (diagnostic.length ?? 0)
        let message = diagnostic.messageText
        if (typeof message === "object") {
            message = concatenateChainedErrors([message])
        }
        const data: DiagnosticData = {
            start,
            end,
            message
        }
        if (diagnosticsByFile[fileKey]) {
            diagnosticsByFile[fileKey].push(data)
        } else {
            diagnosticsByFile[fileKey] = [data]
        }
    })
    const assertSourcePath = getAssertFilePath()
    let assertFile: SourceFile

    if (assertSourcePath.endsWith("js")) {
        // In external node environments, we should use the .d.ts file to find references
        // assertSourcePath should be something like: node_modules/@re-/assert/out/cjs/assert.js
        const assertDefinitionPath = join(
            dirname(assertSourcePath),
            "..",
            "types",
            "assert.d.ts"
        )
        assertFile = project.addSourceFileAtPath(assertDefinitionPath)
    } else {
        // Otherwise, we're importing a .ts file directly, so should be able to access references that way
        assertFile = project.addSourceFileAtPath(assertSourcePath)
    }
    const exportedAssertDeclaration = assertFile
        .getExportSymbols()
        .find((_) => _.getName() === "assert")
        ?.getValueDeclaration()
        ?.asKind(SyntaxKind.VariableDeclaration)
    if (!exportedAssertDeclaration) {
        throw new Error(
            `Unable to locate the 'assert' function from @re-/assert.`
        )
    }
    const references = exportedAssertDeclaration
        .findReferences()
        .flatMap((ref) => ref.getReferences())
    references.forEach((ref) => {
        const file = ref.getSourceFile()
        const fileKey = getFileKey(file.getFilePath())
        const assertCall = ref
            .getNode()
            .getParentIfKind(SyntaxKind.CallExpression)
        if (!assertCall) {
            return
        }
        if (!assertionsByFile[fileKey]) {
            assertionsByFile[fileKey] = []
        }
        const assertArg = assertCall.getArguments()[0]
        let typeToCheck = assertArg.getType()
        let expectedType: Type | undefined
        for (const ancestor of assertCall.getAncestors()) {
            const kind = ancestor.getKind()
            if (kind === SyntaxKind.ExpressionStatement) {
                break
            }
            if (kind === SyntaxKind.PropertyAccessExpression) {
                const propName = ancestor.getLastChild()?.getText()
                if (propName === "returns") {
                    const signatures = typeToCheck.getCallSignatures()
                    if (!signatures.length) {
                        throw new Error(`Unable to extract the return type.`)
                    } else if (signatures.length > 1) {
                        throw new Error(
                            `Unable to extract the return of a function with multiple signatures.`
                        )
                    }
                    typeToCheck = signatures[0].getReturnType()
                } else if (propName === "typedValue") {
                    const typedValueCall = ancestor.getParentIfKind(
                        SyntaxKind.CallExpression
                    )
                    if (typedValueCall) {
                        expectedType = typedValueCall
                            .getArguments()[0]
                            .getType()
                    }
                } else if (propName === "typed") {
                    const typedAsExpression = ancestor.getParentIfKind(
                        SyntaxKind.AsExpression
                    )
                    if (typedAsExpression) {
                        expectedType = typedAsExpression.getType()
                    }
                }
            }
        }
        const errors =
            diagnosticsByFile[fileKey]?.reduce((message, diagnostic) => {
                if (
                    diagnostic.start >= assertArg.getStart() &&
                    diagnostic.end <= assertArg.getEnd()
                ) {
                    if (message) {
                        return `${message}\n${diagnostic.message}`
                    }
                    return diagnostic.message
                }
                return message
            }, "") ?? ""
        // // The start position of the "assert" identifier from the assert call should be the position
        // // we get when we check the line from which assert was called at runtime.
        // const assertCallIdentifier = assertCall.getFirstChildByKindOrThrow(
        //     SyntaxKind.Identifier
        // )
        const start = ts.getLineAndCharacterOfPosition(
            file.compilerNode,
            assertCall.getStart()
        )
        const end = ts.getLineAndCharacterOfPosition(
            file.compilerNode,
            assertCall.getEnd()
        )
        // Add 1 to everything, since trace positions are 1-based and TS positions are 0-based.
        const location: LinePositionRange = {
            start: {
                line: start.line + 1,
                char: start.character + 1
            },
            end: {
                line: end.line + 1,
                char: end.character + 1
            }
        }
        const assertionData: AssertionData = {
            location,
            type: {
                actual: typeToCheck.getText(),
                expected: expectedType?.getText()
            },
            errors
        }
        assertionsByFile[fileKey].push(assertionData)
    })
    analyzeTypeAssertions.cache = assertionsByFile
    return assertionsByFile
}

const isPositionWithinRange = (
    { line, char }: LinePosition,
    { start, end }: LinePositionRange
) => {
    if (line < start.line || line > end.line) {
        return false
    }
    if (line === start.line) {
        return char >= start.char
    }
    if (line === end.line) {
        return char <= end.char
    }
    return true
}

export const getAssertionData = (position: SourcePosition) => {
    const fileKey = getFileKey(position.file)
    const assertionsByFile = analyzeTypeAssertions()
    if (!assertionsByFile[fileKey]) {
        throw new Error(`Found no assertion data for '${fileKey}'.`)
    }
    const matchingAssertion = assertionsByFile[fileKey].find((assertion) => {
        /** Depending on the environment, a trace can refer to any of these points
         * assert(...)
         * ^     ^   ^
         * Because of this, it's safest to check if the call came from anywhere in the expected range.
         **/
        return isPositionWithinRange(position, assertion.location)
    })
    if (!matchingAssertion) {
        throw new Error(
            `Found no assertion at line ${position.line} char ${position.char} in '${fileKey}'.`
        )
    }
    return matchingAssertion
}
