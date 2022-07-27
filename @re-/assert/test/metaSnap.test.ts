import { strict } from "node:assert"
import { rmSync } from "node:fs"
import { fromHere } from "@re-/node"
import { ExpressionStatement } from "ts-morph"
import { afterAll, describe, test } from "vitest"
import {
    getTestComment,
    getTestFileData,
    TestData,
    testFileCopyPath
} from "./metaTests/testHelpers.js"

const snapshotTemplate = fromHere("metaTests", "templateForSnapshots.ts")

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
describe("inline meta tests", () => {
    afterAll(() => {
        rmSync(testFileCopyPath, { force: true })
    })
    test("Checks snap gets populated - precache: true", () => {
        testSnapPopulation(true)
    }, 9999)

    test("Checks snap gets populated - precache: false", () => {
        testSnapPopulation(false)
    }, 9999)
})
