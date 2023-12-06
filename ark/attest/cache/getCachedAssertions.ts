import { readJson, type LinePosition, type SourcePosition } from "@arktype/fs"
import { existsSync } from "node:fs"
import type { AttestConfig } from "../config.js"
import { getFileKey } from "../utils.js"
import {
	analyzeProjectAssertions,
	type LinePositionRange
} from "./writeAssertionCache.js"

export const getCachedAssertionData = (config: AttestConfig) => {
	if (!existsSync(config.assertionCacheFile)) {
		throw new Error(
			`Unable to find precached assertion data at '${config.assertionCacheFile}'. ` +
				`please use Attest CLI or call 'cacheTypeAssertions' before running your tests.`
		)
	}
	return readJson(config.assertionCacheFile)
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

export const getAssertionDataAtPosition = (position: SourcePosition) => {
	const fileKey = getFileKey(position.file)
	const assertionsByFile = analyzeProjectAssertions()
	if (!assertionsByFile[fileKey]) {
		throw new Error(`Found no assertion data for '${fileKey}'.`)
	}
	const matchingAssertion = assertionsByFile[fileKey].find((assertion) => {
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
			`Found no assertion at line ${position.line} char ${position.char} in '${fileKey}'.
Are sourcemaps enabled and working properly?`
		)
	}
	return matchingAssertion
}
