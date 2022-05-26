import { existsSync, mkdirSync, rmSync } from "node:fs"
import { relative } from "node:path"
import { readJson, writeJson } from "@re-/node"
import { Project, SyntaxKind, ts, Type } from "ts-morph"
import {
    getReAssertConfig,
    LinePosition,
    Memoized,
    SourcePosition
} from "../common.js"
import { writeQueuedSnapshotUpdates } from "../value/index.js"

export interface SetupCacheOptions {
    forcePrecache?: boolean
}

export const cacheAssertions = ({ forcePrecache }: SetupCacheOptions = {}) => {
    const config = getReAssertConfig()
    if (!config.precached && !forcePrecache) {
        throw new Error(
            `You must set 'precached' to true in the 'assert' section ` +
                ` of your re.json config to enable precaching.`
        )
    }
    rmSync(config.cacheDir, { recursive: true, force: true })
    mkdirSync(config.cacheDir)
    mkdirSync(config.snapCacheDir)
    writeJson(
        config.assertionCacheFile,
        analyzeTypeAssertions({ isInitialCache: true })
    )
}

export const cleanupAssertions = () => {
    const config = getReAssertConfig()
    try {
        writeQueuedSnapshotUpdates()
    } finally {
        if (!config.preserveCache) {
            rmSync(config.cacheDir, { recursive: true, force: true })
        }
    }
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
        if (!existsSync(config.assertionCacheFile)) {
            throw new Error(
                `Unable to find precached assertion data at '${config.assertionCacheFile}'. ` +
                    `Did you forget to call 'cacheTypeAssertions' before running your tests?`
            )
        }
        analyzeTypeAssertions.cache = readJson(config.assertionCacheFile)
        return analyzeTypeAssertions.cache!
    }
    const project = getTsProject()
    const assertionsByFile: AssertionsByFile = {}
    const diagnosticsByFile: DiagnosticsByFile = {}

    // We have to use this internal checker to access errors ignore by @ts-ignore or @ts-expect-error
    const tsProgram = project.getProgram().compilerObject as any
    const diagnostics: ts.Diagnostic[] = tsProgram
        .getDiagnosticsProducingTypeChecker()
        .getDiagnostics()
    for (const diagnostic of diagnostics) {
        const filePath = diagnostic.file?.fileName
        if (!filePath) {
            continue
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
    }
    for (const file of project.getSourceFiles()) {
        const fileKey = getFileKey(file.getFilePath())
        const assertCalls = file
            .getDescendantsOfKind(SyntaxKind.CallExpression)
            .filter((callExpression) =>
                /*
                 * We get might get some extraneous calls to other "assert" functions,
                 * but they won't be referenced at runtime so shouldn't matter.
                 */
                config.assertAliases.find(
                    (alias) =>
                        alias === callExpression.getFirstChild()?.getText()
                )
            )
        if (!assertCalls.length) {
            continue
        }
        assertionsByFile[fileKey] = assertCalls.map((assertCall) => {
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
                            throw new Error(
                                `Unable to extract the return type.`
                            )
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
            return {
                location,
                type: {
                    actual: typeToCheck.getText(),
                    expected: expectedType?.getText()
                },
                errors
            }
        })
    }
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
        /**
         * Depending on the environment, a trace can refer to any of these points
         * assert(...)
         * ^     ^   ^
         * Because of this, it's safest to check if the call came from anywhere in the expected range.
         *
         */
        return isPositionWithinRange(position, assertion.location)
    })
    if (!matchingAssertion) {
        throw new Error(
            `Found no assertion at line ${position.line} char ${position.char} in '${fileKey}'.`
        )
    }
    return matchingAssertion
}
