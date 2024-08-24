import { attest, contextualize } from "@ark/attest"
import { attestInternal } from "@ark/attest/internal/assert/attest.ts"
import { dirName, readJson, writeJson } from "@ark/fs"
import * as assert from "node:assert/strict"
import { rmSync } from "node:fs"
import { join } from "node:path"

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

beforeEach(() => {
	writeJson(defaultSnapPath, defaultSnapFileContents)
	writeJson(customSnapPath, defaultSnapContentsAtCustomPath)
})

afterEach(() => {
	rmSync(defaultSnapPath, { force: true })
	rmSync(customSnapPath, { force: true })
})

contextualize(() => {
	it("create", () => {
		attest(o).snap.toFile("toFile")
		assert.throws(
			() => attest({ re: "kt" }).snap.toFile("toFile"),
			assert.AssertionError,
			"kt"
		)
		attest(1337).snap.toFile("toFileNew")
		const contents = readJson(defaultSnapPath)
		attest(contents).equals({
			[testFile]: {
				...defaultSnapFileContents[testFile],
				toFileNew: 1337
			}
		})
	})

	it("update existing", () => {
		attestInternal(
			{ re: "dew" },
			{ cfg: { updateSnapshots: true } }
		).snap.toFile("toFileUpdate")
		const updatedContents = readJson(defaultSnapPath)
		const expectedContents = {
			[testFile]: {
				...defaultSnapFileContents[testFile],
				toFileUpdate: { re: "dew" }
			}
		}
		assert.deepEqual(updatedContents, expectedContents)
	})

	it("with path", () => {
		attest(o).snap.toFile("toCustomFile", {
			path: customFileName
		})
		assert.throws(
			() =>
				attest({ re: "kt" }).snap.toFile("toCustomFile", {
					path: customFileName
				}),
			assert.AssertionError,
			"kt"
		)
		attest(null).snap.toFile("toCustomFileNew", {
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
