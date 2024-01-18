import { readJson, type LinePosition, type SourcePosition } from "@arktype/fs"
import { existsSync, readdirSync } from "node:fs"
import { getConfig } from "../config.js"
import { getFileKey } from "../utils.js"
import type {
	AssertionsByFile,
	LinePositionRange,
	TypeAssertionData
} from "./writeAssertionCache.js"
import { join } from "node:path"

export type VerionedAssertionsByFile = [
	tsVersion: string,
	assertions: AssertionsByFile
]

let assertionEntries: VerionedAssertionsByFile[] | undefined
export const getCachedAssertionEntries = () => {
	if (!assertionEntries) {
		const config = getConfig()
		if (!existsSync(config.assertionCacheDir)) {
			throwMissingAssertionDataError(config.assertionCacheDir)
		}
		const assertionFiles = readdirSync(config.assertionCacheDir)
		assertionEntries = assertionFiles.map((file) => [
			// remove .json extension
			file.slice(0, -5),
			readJson(join(config.assertionCacheDir, file))
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

export type VersionedTypeAssertion = [
	tsVersion: string,
	assertionData: TypeAssertionData
]

export const getTypeAssertionsAtPosition = (
	position: SourcePosition
): VersionedTypeAssertion[] => {
	const fileKey = getFileKey(position.file)
	return getCachedAssertionEntries().map(([version, data]) => {
		if (!data[fileKey]) {
			throw new Error(
				`Found no assertion data for '${fileKey}' for TypeScript version ${version}.`
			)
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
