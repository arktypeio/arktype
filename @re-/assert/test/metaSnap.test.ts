import { strict } from "node:assert"
import { rmSync } from "node:fs"
import { ExpressionStatement } from "ts-morph"
import {
    getTestComment,
    getTestFileData,
    TestData,
    testFileCopyPath
} from "./metaTests/testHelpers.js"

const snapshotTemplate = "templateForSnapshots.ts"

const getExpectedResult = (
    statement: ExpressionStatement,
    expectedData: Record<string, string>,
    fileText: string
) => expectedData[getTestComment(statement, fileText)]

const testSnapPopulation = (precached: boolean) => {
    const testData: TestData = getTestFileData(snapshotTemplate, precached)
    for (const statement of testData.statements) {
        const expected = getExpectedResult(
            statement,
            testData.expected,
            testData.sourceFile.getFullText()
        )
        strict.equal(statement.getText(), expected)
    }
}
// describe("inline meta tests", () => {
//     after(() => {
//         rmSync(testFileCopyPath, { force: true })
//     })
//     it("Checks snap gets populated - precache: true", () => {
//         testSnapPopulation(true)
//     }).timeout(9999)

//     it("Checks snap gets populated - precache: false", () => {
//         testSnapPopulation(false)
//     }).timeout(9999)
// })
