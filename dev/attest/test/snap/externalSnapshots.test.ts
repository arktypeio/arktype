import { strict } from "node:assert"
import { rmSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, test } from "mocha"
import { dirName, readJson, writeJson } from "../../../runtime/api.js"
import { attest } from "../../api.js"
const testDir = dirName()
const testFile = "externalSnapshots.test.ts"
const o = { re: "do" }

const defaultFileName = "assert.snapshots.json"
const defaultSnapPath = join(testDir, defaultFileName)
const defaultSnapFileContents = {
    [testFile]: {
        toFile: {
            re: "do"
        },
        toFileUpdate: {
            re: "oldValue"
        }
    }
}

const customFileName = "custom.snapshots.json"
const customSnapPath = join(testDir, customFileName)
const defaultSnapContentsAtCustomPath = {
    [testFile]: {
        toCustomFile: { re: "do" }
    }
}

describe("snapToFile", () => {
    beforeEach(() => {
        writeJson(defaultSnapPath, defaultSnapFileContents)
        writeJson(customSnapPath, defaultSnapContentsAtCustomPath)
    })

    afterEach(() => {
        rmSync(defaultSnapPath, { force: true })
        rmSync(customSnapPath, { force: true })
    })

    test("create", () => {
        attest(o).snapToFile({ id: "toFile" })
        strict.throws(
            () => attest({ re: "kt" }).snapToFile({ id: "toFile" }),
            strict.AssertionError,
            "kt"
        )
        attest(1337).snapToFile({ id: "toFileNew" })
        const contents = readJson(defaultSnapPath)
        attest(contents).equals({
            [testFile]: {
                ...defaultSnapFileContents[testFile],
                toFileNew: 1337
            }
        })
    })
    test("update existing", () => {
        // @ts-ignore (using internal updateSnapshots hook)
        attest({ re: "dew" }, { updateSnapshots: true }).snapToFile({
            id: "toFileUpdate"
        })
        const updatedContents = readJson(defaultSnapPath)
        const expectedContents = {
            [testFile]: {
                ...defaultSnapFileContents[testFile],
                toFileUpdate: { re: "dew" }
            }
        }
        strict.deepEqual(updatedContents, expectedContents)
    })

    test("with path", () => {
        attest(o).snapToFile({
            id: "toCustomFile",
            path: customFileName
        })
        strict.throws(
            () =>
                attest({ re: "kt" }).snapToFile({
                    id: "toCustomFile",
                    path: customFileName
                }),
            strict.AssertionError,
            "kt"
        )
        attest(null).snapToFile({
            id: "toCustomFileNew",
            path: customFileName
        })
        const contents = readJson(customSnapPath)
        attest(contents).equals({
            [testFile]: {
                ...defaultSnapContentsAtCustomPath[testFile],
                toCustomFileNew: null
            }
        })
    })
})
