import { AssertionError, strict, throws } from "node:assert"
import { join } from "node:path"
import { dirName, readJson, writeJson } from "@re-/node"
import { DeepEqualAssertionError } from "@re-/tools"
import { assert } from "../src/assert.js"
const testDir = dirName()
const testFile = "externalSnapshots.test.ts"
const o = { re: "do" }

describe("Snapshots Using Files", () => {
    const defaultSnapshotPath = join(testDir, "assert.snapshots.json")
    const defaultSnapshotFileContents = {
        "externalSnapshots.test.ts": {
            toFile: {
                re: "do"
            },
            toFileUpdate: {
                re: "oldValue"
            }
        }
    }

    it("snap toFile", () => {
        writeJson(defaultSnapshotPath, defaultSnapshotFileContents)
        // Check existing
        assert(o).snap.toFile("toFile")
        // Check existing fail
        strict.throws(
            () => assert({ re: "kt" }).snap.toFile("toFile"),
            DeepEqualAssertionError,
            "kt"
        )
        // Add new
        assert(1337).snap.toFile("toFileNew")
        const contents = readJson(defaultSnapshotPath)
        assert(contents).equals({
            "externalSnapshots.test.ts": {
                ...defaultSnapshotFileContents[testFile],
                toFileNew: 1337
            }
        })
    })
    it("snap update toFile", () => {
        writeJson(defaultSnapshotPath, defaultSnapshotFileContents)
        // @ts-ignore (using internal updateSnapshots hook)
        assert({ re: "dew" }, { updateSnapshots: true }).snap.toFile(
            "toFileUpdate"
        )
        const updatedContents = readJson(defaultSnapshotPath)
        const expectedContents = {
            "externalSnapshots.test.ts": {
                ...defaultSnapshotFileContents[testFile],
                ["toFileUpdate"]: { re: "dew" }
            }
        }
        strict.deepEqual(updatedContents, expectedContents)
        writeJson(defaultSnapshotPath, defaultSnapshotFileContents)
    })

    const defaultSnapshotCustomPath = join(testDir, "custom.snapshots.json")
    const defaultSnapshotCustomFileContents = {
        "externalSnapshots.test.ts": {
            toCustomFile: { re: "do" }
        }
    }

    it("snap to custom file", () => {
        writeJson(defaultSnapshotCustomPath, defaultSnapshotCustomFileContents)
        // Check existing
        assert(o).snap.toFile("toCustomFile", {
            path: "custom.snapshots.json"
        })
        // Check existing fail
        strict.throws(
            () =>
                assert({ re: "kt" }).snap.toFile("toCustomFile", {
                    path: "custom.snapshots.json"
                }),
            DeepEqualAssertionError,
            "kt"
        )
        // Add new
        assert(null).snap.toFile("toCustomFileNew", {
            path: "custom.snapshots.json"
        })
        const contents = readJson(defaultSnapshotCustomPath)
        assert(contents).equals({
            "externalSnapshots.test.ts": {
                ...defaultSnapshotCustomFileContents[testFile],
                toCustomFileNew: null
            }
        })
    })
    it("nonexistent types always fail", () => {
        // @ts-expect-error
        const nonexistent: NonExistent = {}
        throws(
            () =>
                assert(nonexistent).typed as {
                    something: "specific"
                },
            AssertionError,
            "specific"
        )
    })
})
