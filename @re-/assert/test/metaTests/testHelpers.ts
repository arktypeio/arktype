import { copyFileSync } from "node:fs"
import { fromHere, readJson, shell } from "@re-/node"
import { ExpressionStatement, Project, SourceFile, SyntaxKind } from "ts-morph"

export type TestData = {
    statements: ExpressionStatement[]
    expected: Record<number | string, string>
    sourceFile: SourceFile
    initialText: string
}
const snapMatch = /\.snap\((.+)?\)/
const benchMeanMedianMatch = /\.(mean|median)\(`\d+\.\d+(ns|us|s|ms)`\)/
export const markMatch =
    /\.mark\(\{(mean|median): ?`\d+\.\d+(ns|us|ms|s)`, ?(mean|median): ?`\d+\.\d+(ns|us|ms|s)`\}\)/

const EXPECTED_RESULTS_JSON_PATH = fromHere("expectedResults.json")
const PATH_TO_ASSERTIONS_DIR = fromHere(".reassert")
const testFile = "copiedTestFile.ts"
export const testFileCopyPath = fromHere(testFile)

const filterExpressionStatements = (statements: ExpressionStatement[]) =>
    statements.filter(
        (statement) =>
            benchMeanMedianMatch.test(statement.getText()) ||
            snapMatch.test(statement.getText()) ||
            markMatch.test(statement.getText())
    )

export const getTestComment = (
    statement: ExpressionStatement,
    fileText: string
) => {
    const range = statement.getLeadingCommentRanges()
    return fileText
        .slice(range[0].getPos(), range[0].getEnd())
        .replace("//", "")
        .trim()
}
export const cleanUpSourceFile = (sf: SourceFile, template: string) => {
    sf.replaceWithText(template)
    sf.saveSync()
}

export const getTestFileData = (templateFilename: string, precache = true) => {
    const templatePath = fromHere(`${templateFilename}`)
    const project = new Project()
    const emptySnapsTemplateFile = project.addSourceFileAtPath(templatePath)
    const initialText = emptySnapsTemplateFile.getFullText()
    copyFileSync(templatePath, testFileCopyPath)

    if (precache) {
        shell(`pnpm ts-node ${testFileCopyPath} --reassertTestPreCached`, {
            env: { RE_ASSERT_CMD: `--cacheDir ${PATH_TO_ASSERTIONS_DIR}` }
        })
    } else {
        shell(`pnpm ts-node ${testFileCopyPath}`, {
            env: { RE_ASSERT_CMD: undefined }
        })
    }

    const sourceFile = project.addSourceFileAtPath(testFileCopyPath)
    const expressionStatements = sourceFile.getDescendantsOfKind(
        SyntaxKind.ExpressionStatement
    )
    return {
        statements: filterExpressionStatements(expressionStatements) ?? [],
        expected: readJson(EXPECTED_RESULTS_JSON_PATH),
        sourceFile,
        initialText
    }
}
