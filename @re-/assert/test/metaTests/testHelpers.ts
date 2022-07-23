import { copyFileSync } from "node:fs"
import { fromHere, readJson, shell } from "@re-/node"
import { ExpressionStatement, Project, SourceFile, SyntaxKind } from "ts-morph"

export type TestData = {
    statements: ExpressionStatement[]
    expected: Record<number | string, string>
    sourceFile: SourceFile
    initialText: string
}
const snapRegex = /\.snap\((.+)?\)/
const BENCH_STATS = ["mean", "median"]
const TIME_UNITS = ["ns", "us", "ms", "s"]

const createBenchStatExpression = (asMark: boolean, stat?: string) =>
    `(${stat ? stat : BENCH_STATS.join("|")})${
        asMark ? ": " : "("
    }\`d+.d+(${TIME_UNITS.join("|")})\`${asMark ? "}" : ")"}`

const benchStatSnapCall = new RegExp(createBenchStatExpression(false))
export const benchMarkSnapCall = new RegExp(createBenchStatExpression(true))
export const medianBenchRegex = new RegExp(
    createBenchStatExpression(false, "median")
)
export const meanBenchRegex = new RegExp(
    createBenchStatExpression(false, "mean")
)
export const benchTypeRegex = /type\(d+\sinstantiations\)/

const EXPECTED_RESULTS_JSON_PATH = fromHere("expectedResults.json")
const PATH_TO_ASSERTIONS_DIR = fromHere(".reassert")
const testFile = "copiedTestFile.ts"
export const testFileCopyPath = fromHere(testFile)

const filterExpressionStatements = (statements: ExpressionStatement[]) =>
    statements.filter(
        (statement) =>
            benchStatSnapCall.test(statement.getText()) ||
            snapRegex.test(statement.getText()) ||
            benchMarkSnapCall.test(statement.getText()) ||
            benchTypeRegex.test(statement.getText())
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
        statements: filterExpressionStatements(expressionStatements),
        expected: readJson(EXPECTED_RESULTS_JSON_PATH),
        sourceFile,
        initialText
    }
}
