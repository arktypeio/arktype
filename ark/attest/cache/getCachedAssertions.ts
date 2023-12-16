import { readJson, type LinePosition, type SourcePosition } from "@arktype/fs"
import { existsSync, readdirSync } from "node:fs"
import { basename } from "node:path"
import { getConfig } from "../config.js"
import { getFileKey } from "../utils.js"
import type {
	AssertionsByFile,
	LinePositionRange,
	SerializedAssertionData
} from "./writeAssertionCache.js"

export type VerionsedAssertionEntry = [
	tsVersion: string,
	assertions: AssertionsByFile
]

let assertionEntries: VerionsedAssertionEntry[] | undefined
export const getCachedAssertionEntries = () => {
	if (!assertionEntries) {
		const config = getConfig()
		if (!existsSync(config.assertionCacheDir)) {
			throwMissingAssertionDataError(config.assertionCacheDir)
		}
		const assertionFiles = readdirSync(config.assertionCacheDir)
		assertionEntries = assertionFiles.map((path) => [
			// remove .json extension
			basename(path).slice(0, -5),
			readJson(path)
		])
	}
	return assertionEntries!
}

const throwMissingAssertionDataError = (location: string) => {
	throw new Error(
		`Unable to find precached assertion data at '${location}'. ` +
			`Ensure the 'setup' function from @arktype/attest has been called before running your tests.`
	)
}

const isPositionWithinRange = (
	{ line, char }: LinePosition,
	{ start, end }: LinePositionRange
) => {
	if (line < start.line || line > end.line) {
		return false
	}
	if (line === start.line) {
		return char >= start.char
	}
	if (line === end.line) {
		return char <= end.char
	}
	return true
}

export type VersionedAssertionEntry = [
	tsVersion: string,
	assertionData: SerializedAssertionData
]

export const getAssertionDataAtPosition = (
	position: SourcePosition
): VersionedAssertionEntry[] => {
	const fileKey = getFileKey(position.file)
	return getCachedAssertionEntries().map(([version, data]) => {
		if (!data[fileKey]) {
			throw new Error(`Found no assertion data for '${fileKey}'.`)
		}
		const matchingAssertion = data[fileKey].find((assertion) => {
			/**
			 * Depending on the environment, a trace can refer to any of these points
			 * attest(...)
			 * ^     ^   ^
			 * Because of this, it's safest to check if the call came from anywhere in the expected range.
			 *
			 */
			return isPositionWithinRange(position, assertion.location)
		})
		if (!matchingAssertion) {
			throw new Error(
				`Found no assertion for TypeScript version ${version} at line ${position.line} char ${position.char} in '${fileKey}'.
	Are sourcemaps enabled and working properly?`
			)
		}
		return [version, matchingAssertion]
	})
}

export const assertByVersion = (
	position: SourcePosition,
	fn: (data: SerializedAssertionData, version: string) => void
) =>
	getAssertionDataAtPosition(position).forEach(([version, data]) =>
		fn(data, version)
	)
