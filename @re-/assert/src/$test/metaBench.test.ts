import { AssertionError } from "node:assert"
import { rmSync } from "node:fs"
import { fromHere } from "@re-/node"
import { afterAll, describe, test } from "vitest"
import {
    benchMarkSnapCall,
    getTestComment,
    getTestFileData,
    meanBenchRegex,
    medianBenchRegex,
    TestData,
    testFileCopyPath
} from "./metaTests/testHelpers.js"

const benchTemplate = fromHere("metaTests", "templateForBenches.ts")

const throwAssertionError = (statementText: string) => {
    throw new AssertionError({
        message: `${statementText} did not match the expected benchmark pattern.`
    })
}
const checkBenchStatHasSomethingInIt = (
    callType: string,
    statementText: string
) => {
    switch (callType) {
        case "median":
            if (!medianBenchRegex.test(statementText)) {
                throwAssertionError(statementText)
            }
            break
        case "mean":
            if (!meanBenchRegex.test(statementText)) {
                throwAssertionError(statementText)
            }
            break
        case "mark":
            if (!benchMarkSnapCall.test(statementText)) {
                throwAssertionError(statementText)
            }
            break
    }
}
const checkThatBenchSnapGetsPopulated = (testData: TestData) => {
    for (const statement of testData.statements) {
        const comment = getTestComment(
            statement,
            testData.sourceFile.getFullText()
        )
        checkBenchStatHasSomethingInIt(comment, statement.getText())
    }
}
describe("bench", () => {
    afterAll(() => {
        rmSync(testFileCopyPath, { force: true })
    })
    test("checks that bench set some kind of value", () => {
        const testData: TestData = getTestFileData(benchTemplate, false)
        checkThatBenchSnapGetsPopulated(testData)
    }, 19999)
})
