import { attest, contextualize } from "@ark/attest"
import { MissingSnapshotError } from "@ark/attest/internal/assert/assertions.ts"
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
		attestInternal(1337, {
			cfg: { failOnMissingSnapshots: false }
		}).snap.toFile("toFileNew")
		const contents = readJson(defaultSnapPath)
		attest(contents).equals({
			[testFile]: {
				...defaultSnapFileContents[testFile],
				toFileNew: 1337
			}
		})
	})

	it("create file", () => {
		rmSync(defaultSnapPath)
		attestInternal(o, {
			cfg: { failOnMissingSnapshots: false }
		}).snap.toFile("toFile")
		attest(readJson(defaultSnapPath)).equals({
			[testFile]: { toFile: o }
		})
	})

	it("update existing", () => {
		attestInternal(
			{ re: "dew" },
			{ cfg: { updateSnapshots: true, failOnMissingSnapshots: false } }
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
		attestInternal(null, {
			cfg: { failOnMissingSnapshots: false }
		}).snap.toFile("toCustomFileNew", {
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

	it("preserves falsy snapshots without overwriting", () => {
		const falsyCases: [string, unknown, unknown][] = [
			["falsyFalse", false, true],
			["falsyZero", 0, 1],
			["falsyEmptyString", "", "nonempty"],
			["falsyNull", null, "notNull"]
		]
		for (const [id, saved, mismatch] of falsyCases) {
			attestInternal(saved, {
				cfg: { updateSnapshots: false, failOnMissingSnapshots: false }
			}).snap.toFile(id)
			attestInternal(saved, {
				cfg: { updateSnapshots: false, failOnMissingSnapshots: true }
			}).snap.toFile(id)
			assert.throws(
				() =>
					attestInternal(mismatch, {
						cfg: { updateSnapshots: false, failOnMissingSnapshots: true }
					}).snap.toFile(id),
				assert.AssertionError
			)
			assert.equal(
				(readJson(defaultSnapPath)[testFile] as Record<string, unknown>)[id],
				saved
			)
		}
	})

	it("failOnMissingSnapshots", () => {
		assert.throws(
			() =>
				attestInternal("new", {
					cfg: { failOnMissingSnapshots: true }
				}).snap.toFile("missingCase"),
			MissingSnapshotError
		)
	})
})
