import { readJson, type LinePosition, type SourcePosition } from "@ark/fs"
import { existsSync } from "node:fs"
import { getConfig } from "../config.ts"
import { getFileKey } from "../utils.ts"
import type {
	AssertionsByFile,
	LinePositionRange,
	TypeAssertionData,
	TypeAssertionKind
} from "./writeAssertionCache.ts"

let cachedAssertions: AssertionsByFile | undefined

const getCachedAssertions = (): AssertionsByFile => {
	if (!cachedAssertions) {
		const { assertionCachePath } = getConfig()
		if (!existsSync(assertionCachePath)) {
			throw new Error(
				`Unable to find precached assertion data at '${assertionCachePath}'. ` +
					`Ensure the 'setup' function from @ark/attest has been called before running your tests.`
			)
		}
		cachedAssertions = readJson(assertionCachePath) as AssertionsByFile
	}
	return cachedAssertions
}

const isPositionWithinRange = (
	{ line, char }: LinePosition,
	{ start, end }: LinePositionRange
) => {
	if (line < start.line || line > end.line) return false

	if (line === start.line) return char >= start.char

	if (line === end.line) return char <= end.char

	return true
}

const getAssertionOfKindAtPosition = <kind extends TypeAssertionKind>(
	position: SourcePosition,
	kind: kind
): TypeAssertionData<kind> => {
	const fileKey = getFileKey(position.file)
	const assertions = getCachedAssertions()[fileKey]
	if (!assertions) throw new Error(`Found no assertion data for '${fileKey}'.`)

	const matchingAssertion = assertions.find(
		assertion =>
			(kind === "type" ? "args" in assertion : "count" in assertion) &&
			/**
			 * Depending on the environment, a trace can refer to any of these points
			 * attest(...)
			 * ^     ^   ^
			 * Because of this, it's safest to check if the call came from anywhere in the expected range.
			 *
			 */
			isPositionWithinRange(position, assertion.location)
	)
	if (!matchingAssertion) {
		throw new Error(
			`Found no assertion at line ${position.line} char ${position.char} in '${fileKey}'.
	Are sourcemaps enabled and working properly?`
		)
	}
	return matchingAssertion as TypeAssertionData<kind>
}

export const getTypeAssertionAtPosition = (
	position: SourcePosition
): TypeAssertionData<"type"> => getAssertionOfKindAtPosition(position, "type")

export const getBenchAssertionAtPosition = (
	position: SourcePosition
): TypeAssertionData<"bench"> => getAssertionOfKindAtPosition(position, "bench")
