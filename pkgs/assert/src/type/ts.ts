import { Project, SyntaxKind, ResolutionHostFactory, ts, Type } from "ts-morph"
import { dirname, join, basename } from "deno/std/path/mod.ts"
import {
    SourcePosition,
    LinePosition,
    readJsonSync,
    writeJsonSync
} from "src/common.ts"

// Absolute file paths TS will parse to raw contents
export type ContentsByFile = Record<string, string>

export type TypeContextOptions = {
    tsConfig?: string
}

let project: Project | undefined = undefined

export const getTsProject = (options: TypeContextOptions = {}) => {
    if (!project) {
        const packageJson = JSON.parse(Deno.readTextFileSync("package.json"))
        const tsConfigFilePath =
            options.tsConfig ?? packageJson.assertTsConfig
                ? packageJson.assertTsConfig
                : "tsconfig.json"
        project = new Project({
            tsConfigFilePath
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

type AssertionsByDir = Record<string, AssertionsByFile>

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
    const assertionsByDir: AssertionsByDir = {}
    const assertFile = project.getSourceFile("src/assert.ts")
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
        const dirPath = dirname(filePath)
        const fileName = basename(filePath)
        const assertCall = ref
            .getNode()
            .getParentIfKind(SyntaxKind.CallExpression)
        if (!assertCall) {
            return
        }
        if (!assertionsByDir[dirPath]) {
            assertionsByDir[dirPath] = {}
        }
        if (!assertionsByDir[dirPath][fileName]) {
            assertionsByDir[dirPath][fileName] = []
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
        const errors =
            diagnosticsByFile[filePath]?.reduce((message, diagnostic) => {
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
        assertionsByDir[dirPath][fileName].push(assertionData)
    })
    Object.entries(assertionsByDir).forEach(([dirPath, assertionsByFile]) => {
        writeJsonSync(getExpectedAssertionsPath(dirPath), assertionsByFile)
    })
}

export const getExpectedAssertionsPath = (dirPath: string) =>
    join(dirPath, ".assertions.json")

const getAssertionsForFile = (file: string): AssertionData[] => {
    const dirPath = dirname(file)
    let dirAssertionData = readJsonSync(getExpectedAssertionsPath(dirPath))
    if (!dirAssertionData) {
        serializeTypeData(getTsProject())
    }
    dirAssertionData = readJsonSync(getExpectedAssertionsPath(dirPath))
    if (!dirAssertionData || !dirAssertionData[basename(file)]) {
        throw new Error(`Unable to find serialized assertion data for ${file}.`)
    }
    return dirAssertionData[basename(file)]
}

export const getAssertionData = (position: SourcePosition) => {
    const fileAssertions = getAssertionsForFile(position.file)
    const match = fileAssertions.find(
        (assertion) =>
            assertion.position.line === position.line &&
            assertion.position.char === position.char
    )
    if (!match) {
        throw new Error(
            `Found no assertion at line ${position.line} char ${position.char} in ${position.file}.`
        )
    }
    return match
}
