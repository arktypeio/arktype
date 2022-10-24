import { strict } from "node:assert"
import { rmSync } from "node:fs"
import { join } from "node:path"
import { dirName, readJson, writeJson } from "#runtime"
import { afterEach, beforeEach, describe, test } from "mocha"
import { assert } from "../../../api.js"
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
        assert(o).snapToFile({ id: "toFile" })
        strict.throws(
            () => assert({ re: "kt" }).snapToFile({ id: "toFile" }),
            strict.AssertionError,
            "kt"
        )
        assert(1337).snapToFile({ id: "toFileNew" })
        const contents = readJson(defaultSnapPath)
        assert(contents).equals({
            [testFile]: {
                ...defaultSnapFileContents[testFile],
                toFileNew: 1337
            }
        })
    })
    test("update existing", () => {
        // @ts-ignore (using internal updateSnapshots hook)
        assert({ re: "dew" }, { updateSnapshots: true }).snapToFile({
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
        assert(o).snapToFile({
            id: "toCustomFile",
            path: customFileName
        })
        strict.throws(
            () =>
                assert({ re: "kt" }).snapToFile({
                    id: "toCustomFile",
                    path: customFileName
                }),
            strict.AssertionError,
            "kt"
        )
        assert(null).snapToFile({
            id: "toCustomFileNew",
            path: customFileName
        })
        const contents = readJson(customSnapPath)
        assert(contents).equals({
            [testFile]: {
                ...defaultSnapContentsAtCustomPath[testFile],
                toCustomFileNew: null
            }
        })
    })
})
