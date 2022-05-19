import { tsMorph } from "../deps.ts"
const { Project, SyntaxKind, ts } = tsMorph
import { dirname, join, relative, fromFileUrl } from "../deps.ts"
import {
    SourcePosition,
    LinePosition,
    readJsonSync,
    writeJsonSync,
    existsSync,
    getReAssertConfig,
    Memoized,
    isDeno
} from "../common.ts"
import { writeQueuedSnapshotUpdates } from "../value/index.ts"
import { getAssertFilePath } from "../assert.ts"

const removeTsExtension = (moduleName: string) =>
    moduleName.replace(/\.(m|c)?tsx?$/, "")

const denoResolutionHost: tsMorph.ResolutionHostFactory = (
    moduleResolutionHost,
    getCompilerOptions
) => {
    return {
        resolveModuleNames: (moduleNames, containingFile) => {
            const compilerOptions = getCompilerOptions()
            const resolvedModules: tsMorph.ts.ResolvedModule[] = []

            for (const moduleName of moduleNames.map(removeTsExtension)) {
                const result = ts.resolveModuleName(
                    moduleName,
                    containingFile,
                    compilerOptions,
                    moduleResolutionHost
                )
                if (result.resolvedModule) {
                    resolvedModules.push(result.resolvedModule)
                } else {
                    resolvedModules.push(
                        ts.resolveModuleName(
                            // Resolve this file as a dummy to avoid crashing.
                            fromFileUrl(import.meta.url),
                            containingFile,
                            compilerOptions,
                            moduleResolutionHost
                        ).resolvedModule!
                    )
                }
            }
            return resolvedModules
        }
    }
}

export const cacheTypeAssertions = () => {
    const config = getReAssertConfig()
    if (!config.precached) {
        throw new Error(
            `You must set 'precached' to true in the 'assert' section ` +
                ` of your re.json config to enable precaching.`
        )
    }
    writeJsonSync(
        config.precachePath,
        analyzeTypeAssertions({ isInitialCache: true })
    )
}

export const cleanupTypeAssertionCache = () => {
    const config = getReAssertConfig()
    writeQueuedSnapshotUpdates(config.precachePath)
    Deno.removeSync(config.precachePath)
}

export const getTsProject: Memoized<() => tsMorph.Project> = () => {
    if (!getTsProject.cache) {
        const config = getReAssertConfig()
        const tsConfigFilePath = existsSync(config.tsconfig)
            ? config.tsconfig
            : undefined
        const resolutionHost = isDeno ? denoResolutionHost : undefined
        const project = new Project({
            tsConfigFilePath,
            resolutionHost
        })
        if (!tsConfigFilePath) {
            project.addSourceFilesAtPaths(["**"])
        }
        getTsProject.cache = project
    }
    return getTsProject.cache
}

type CallerPosition = LinePosition & {
    name: string
}

type AssertionData = {
    caller: CallerPosition
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
    diagnostics: tsMorph.ts.DiagnosticMessageChain[]
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
        analyzeTypeAssertions.cache = readJsonSync(config.precachePath)
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
    const diagnostics: tsMorph.ts.Diagnostic[] = tsProgram
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
    let assertFile: tsMorph.SourceFile

    if (assertSourcePath.endsWith("js")) {
        // In external node environments, we should use the .d.ts file to find references
        // assertSourcePath should be something like: node_modules/@re-/assert/out/script/src/assert.js
        const assertDefinitionPath = join(
            dirname(assertSourcePath),
            "..",
            "..",
            "types",
            "src",
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
        let expectedType: tsMorph.Type | undefined
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
        // The start position of the "assert" identifier from the assert call should be the position
        // we get when we check the line from which assert was called at runtime.
        const assertCallIdentifier = assertCall.getFirstChildByKindOrThrow(
            SyntaxKind.Identifier
        )
        const identifierName = assertCallIdentifier.getSymbolOrThrow().getName()
        const caller: CallerPosition = {
            name: identifierName,
            line: assertCallIdentifier.getStartLineNumber(),
            char:
                // ts-morph doesn't seem to directly expose inline character position.
                // Subtract the line's start from the node's start to calculate it.
                assertCallIdentifier.getStart() -
                assertCallIdentifier.getStartLinePos() +
                // Add 1 so the inline position is 1-based instead of 0-based.
                1
        }
        const assertionData: AssertionData = {
            caller,
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

export const getAssertionData = (position: SourcePosition) => {
    const fileKey = getFileKey(position.file)
    const assertionsByFile = analyzeTypeAssertions()
    if (!assertionsByFile[fileKey]) {
        throw new Error(`Found no assertion data for '${fileKey}'.`)
    }
    const matchingAssertion = assertionsByFile[fileKey].find((assertion) => {
        if (assertion.caller.line === position.line) {
            if (assertion.caller.char === position.char) {
                return true
            } else if (
                // In some environments, stack trace positions start from the end of the identifier instead of the start
                assertion.caller.char + assertion.caller.name.length ===
                position.char
            ) {
                return true
            }
        }
    })
    if (!matchingAssertion) {
        throw new Error(
            `Found no assertion at line ${position.line} char ${position.char} in '${fileKey}'.`
        )
    }
    return matchingAssertion
}
