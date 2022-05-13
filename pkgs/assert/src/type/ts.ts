import { Project, SyntaxKind, ResolutionHostFactory, ts } from "ts-morph"
import { fromFileUrl, dirname, join } from "@deno/path"
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
                    // throw new Error(
                    //     `TypeScript was unable to resolve module ${moduleName} from '${containingFile}'.`
                    // )
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
    type: string
    errors: string[]
}

type AssertionsByFile = Record<string, AssertionData[]>

export const serializeTypeData = (project: Project) => {
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
        const file = ref.getSourceFile().getFilePath()
        const callExpression = ref
            .getNode()
            .getParentIfKind(SyntaxKind.CallExpression)
        if (!callExpression) {
            return
        }
        if (!assertionsByFile[file]) {
            assertionsByFile[file] = []
        }
        const assertedArg = callExpression.getArguments()[0]
        const pos = ts.getLineAndCharacterOfPosition(
            callExpression.getSourceFile().compilerNode,
            callExpression.getPos() + callExpression.getLeadingTriviaWidth()
        )
        const assertionData: AssertionData = {
            type: assertedArg.getType().getText(),
            errors: [],
            position: {
                line: pos.line + 1,
                char: pos.character + 1
            }
        }
        assertionsByFile[file].push(assertionData)
    })
    writeAssertionData(assertionsByFile)
    return assertionsByFile
}

const expectedAssertionsPath = join(dirName, "assertions.json")

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

export const findMatchingAssertionData = (position: SourcePosition) => {
    const data = readAssertionData()
    const fileName = fromFileUrl(position.file)
    if (!data[fileName]) {
        throw new Error(`Found no assertion data for ${fileName}.`)
    }
    const match = data[fileName].find(
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

export const getAssertedTypeErrors = (position: SourcePosition) =>
    findMatchingAssertionData(position).errors.join("\n")

export const getAssertedTypeString = (position: SourcePosition) =>
    findMatchingAssertionData(position).type

serializeTypeData(getTsProject())
