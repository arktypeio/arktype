import { Project, SyntaxKind, ResolutionHostFactory, ts, Type } from "ts-morph"
import { fromFileUrl, dirname, resolve } from "@deno/path"
import { SourcePosition, LinePosition } from "../positions.ts"

// Absolute file paths TS will parse to raw contents
export type ContentsByFile = Record<string, string>

export type TypeContextOptions = {
    tsConfig?: string
}

let project: Project | undefined = undefined

const fileName = fromFileUrl(import.meta.url)
const dirName = dirname(fileName)

const resolutionHost: ResolutionHostFactory = (
    moduleResolutionHost,
    getCompilerOptions
) => {
    return {
        resolveModuleNames: (moduleNames, containingFile) => {
            const compilerOptions = getCompilerOptions()
            const resolvedModules: ts.ResolvedModule[] = []

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
                            fileName,
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

    function removeTsExtension(moduleName: string) {
        if (moduleName.slice(-3).toLowerCase() === ".ts")
            return moduleName.slice(0, -3)
        return moduleName
    }
}

export const getTsProject = (options: TypeContextOptions = {}) => {
    if (!project) {
        const packageJson = JSON.parse(Deno.readTextFileSync("package.json"))
        const tsConfigFilePath =
            options.tsConfig ?? packageJson.assertTsConfig
                ? packageJson.assertTsConfig
                : "tsconfig.json"
        project = new Project({
            tsConfigFilePath,
            resolutionHost
        })
    }
    return project
}

type AssertionData = {
    position: LinePosition
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

export const serializeTypeData = (project: Project) => {
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
        if (diagnosticsByFile[filePath]) {
            diagnosticsByFile[filePath].push(data)
        } else {
            diagnosticsByFile[filePath] = [data]
        }
    })
    const assertionsByFile: AssertionsByFile = {}
    const assertFile = project.getSourceFile("assert.ts")
    const assertFunction = assertFile
        ?.getExportSymbols()
        .find((_) => _.getName() === "assert")
    const declaration = assertFunction
        ?.getValueDeclaration()
        ?.asKind(SyntaxKind.VariableDeclaration)
    if (!declaration) {
        throw new Error(
            `Unable to locate the 'assert' function from @re-/assert.`
        )
    }
    const references = declaration
        .findReferences()
        .flatMap((ref) => ref.getReferences())
    references.forEach((ref) => {
        const file = ref.getSourceFile()
        const filePath = file.getFilePath()
        const assertCall = ref
            .getNode()
            .getParentIfKind(SyntaxKind.CallExpression)
        if (!assertCall) {
            return
        }
        if (!assertionsByFile[filePath]) {
            assertionsByFile[filePath] = []
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
        const pos = ts.getLineAndCharacterOfPosition(
            assertCall.getSourceFile().compilerNode,
            assertCall.getPos() + assertCall.getLeadingTriviaWidth()
        )
        const errors = diagnosticsByFile[filePath].reduce(
            (message, diagnostic) => {
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
            },
            ""
        )
        const assertionData: AssertionData = {
            type: {
                actual: typeToCheck.getText(),
                expected: expectedType?.getText()
            },
            errors,
            // TypeScript's line + character are 0-based. Convert to 1-based.
            position: {
                line: pos.line + 1,
                char: pos.character + 1
            }
        }
        assertionsByFile[filePath].push(assertionData)
    })
    writeAssertionData(assertionsByFile)
    return assertionsByFile
}

const expectedAssertionsPath = resolve(".assertions.json")

const writeAssertionData = (assertionsByFile: AssertionsByFile) =>
    Deno.writeTextFileSync(
        expectedAssertionsPath,
        JSON.stringify(assertionsByFile, null, 4)
    )

const readAssertionData = (): AssertionsByFile => {
    try {
        return JSON.parse(Deno.readTextFileSync(expectedAssertionsPath))
    } catch {
        return serializeTypeData(getTsProject())
    }
}

export const getAssertionData = (position: SourcePosition) => {
    const data = readAssertionData()
    if (!data[position.file]) {
        throw new Error(`Found no assertion data for ${fileName}.`)
    }
    const match = data[position.file].find(
        (assertion) =>
            assertion.position.line === position.line &&
            assertion.position.char === position.char
    )
    if (!match) {
        throw new Error(
            `Found no assertion at line ${position.line} char ${position.char} in ${fileName}.`
        )
    }
    return match
}
