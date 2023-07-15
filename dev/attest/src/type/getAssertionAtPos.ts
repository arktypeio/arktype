import type {
	LinePosition,
	LinePositionRange,
	SourcePosition
} from "../utils.js"
import { getFileKey } from "../utils.js"
import { getAssertionsByFile } from "./analysis.js"

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

export const getTypeDataAtPos = (position: SourcePosition) => {
	const fileKey = getFileKey(position.file)
	const assertionsByFile = getAssertionsByFile()
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
