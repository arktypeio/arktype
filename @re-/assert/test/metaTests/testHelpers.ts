import { strict } from "node:assert"
import { fromHere, readJson, shell } from "@re-/node"
import {
    ExpressionStatement,
    Project,
    SourceFile,
    SyntaxKind,
    VariableStatement
} from "ts-morph"

const EXPECTED_RESULTS_JSON_PATH = fromHere("expectedResults.json")
const PATH_TO_ASSERTIONS_DIR = fromHere(".reassert")

const getExpressionStatements = (
    functionName: string,
    varStatements: VariableStatement[]
) =>
    varStatements
        .find((statement) => statement.getText().includes(functionName))
        ?.getDescendantsOfKind(SyntaxKind.ExpressionStatement)

const getTestComment = (statement: ExpressionStatement, text: string) => {
    const range = statement.getLeadingCommentRanges()
    return text
        .slice(range[0].getPos(), range[0].getEnd())
        .replace("//", "")
        .trim()
}
export const cleanUpSourceFile = async (sf: SourceFile, template: string) => {
    sf.replaceWithText(template)
    await sf.save()
}
export const getExpectedResult = (
    statement: ExpressionStatement,
    expectedData: Record<string, string>,
    text: string
) => expectedData[getTestComment(statement, text)]

export const checkIfTestsContainErrors = (
    statements: ExpressionStatement[],
    expectedValues: Record<string, string>,
    fullText: string
) => {
    let hasErrors = false
    for (const statement of statements) {
        const expected = getExpectedResult(statement, expectedValues, fullText)
        try {
            strict.deepEqual(statement.getText(), expected)
        } catch (e) {
            // @ts-ignore
            console.log(`actual: ${e.actual} \nexpected: ${e.expected}`)
            hasErrors = true
            break
        }
    }
    return hasErrors
}
export const checkThatBenchSnapGetsPopulated = (
    statements: ExpressionStatement[]
) => {
    const meanMedianRegex = /\.(median|mean)\(`\d+\.\d+(ns|us|s|ms)`\)/
    const markRegex =
        /\.mark\(\{(mean|median): ?`\d+\.+\d+(ns|us|ms|s)\\, ?median: ?`\d+\.\d+(ns|us|ms|s)`\}\)/
    let errors = false
    for (const statement of statements) {
        if (
            !(
                meanMedianRegex.test(statement.getText()) ||
                markRegex.test(statement.getText())
            )
        ) {
            errors = true
            break
        }
    }
    return errors
}

export const getTestFileData = async (
    filename: string,
    templateFilename: string,
    precache = true
) => {
    const filePath = fromHere(`${filename}.ts`)
    const templatePath = fromHere(`${templateFilename}`)
    const p = new Project()
    const emptySnapsTemplateFile = p.addSourceFileAtPath(templatePath)
    const initialText = emptySnapsTemplateFile.getFullText()
    const sourceFile = p.addSourceFileAtPath(filePath)
    await cleanUpSourceFile(sourceFile, initialText)
    //run file
    precache
        ? shell(`pnpm ts-node ${filePath} --reassertTestPreCached`, {
              env: { RE_ASSERT_CMD: `--cacheDir ${PATH_TO_ASSERTIONS_DIR}` }
          })
        : shell(`pnpm ts-node ${filePath}`, {
              env: { RE_ASSERT_CMD: undefined }
          })

    sourceFile.refreshFromFileSystemSync()
    const varStatements = sourceFile.getVariableStatements()

    return {
        statements: getExpressionStatements(filename, varStatements) || [],
        expected: readJson(EXPECTED_RESULTS_JSON_PATH),
        fullText: sourceFile.getFullText(),
        sourceFile,
        initialText
    }
}
