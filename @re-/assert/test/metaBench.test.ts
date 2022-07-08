import { AssertionError } from "node:assert"
import { rmSync } from "node:fs"
import {
    getTestComment,
    getTestFileData,
    markMatch,
    TestData,
    testFileCopyPath
} from "./metaTests/testHelpers.js"

const benchTemplate = "templateForBenches.ts"

const meanMatch = /\.mean\(`\d+\.\d+(ns|us|s|ms)`\)/
const medianMatch = /\.median\(`\d+\.\d+(ns|us|s|ms)`\)/

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
            if (!medianMatch.test(statementText)) {
                throwAssertionError(statementText)
            }
            break
        case "mean":
            if (!meanMatch.test(statementText)) {
                throwAssertionError(statementText)
            }
            break
        case "mark":
            if (!markMatch.test(statementText)) {
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
    after(() => {
        rmSync(testFileCopyPath)
    })
    it("checks that bench set some kind of value", () => {
        const testData: TestData = getTestFileData(benchTemplate, false)
        checkThatBenchSnapGetsPopulated(testData)
    }).timeout(19999)
})
