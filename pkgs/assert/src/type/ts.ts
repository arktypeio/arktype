import { Project } from "ts-morph"
import * as morph from "ts-morph"

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
        project = new Project({ tsConfigFilePath })
    }
    return project
}

export const serializeTypeData = (project: Project) => {
    const assertFile = project.getSourceFile("assert.ts")
    if (assertFile) {
        const assertFunction = assertFile
            .getExportSymbols()
            .find((_) => _.getName() === "assert")
        const declaration = assertFunction
            ?.getValueDeclaration()
            ?.asKind(morph.SyntaxKind.VariableDeclaration)
        const references = declaration?.findReferences()
        console.log(references)
    }
}

serializeTypeData(getTsProject())
