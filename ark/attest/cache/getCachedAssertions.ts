import { readJson, type LinePosition, type SourcePosition } from "@arktype/fs"
import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { getConfig } from "../config.js"
import { getFileKey } from "../utils.js"
import type {
	AssertionsByFile,
	LinePositionRange,
	TypeAssertionData,
	TypeBenchmarkingAssertionData,
	TypeRelationshipAssertionData
} from "./writeAssertionCache.js"

export type VersionedAssertionsByFile = [
	tsVersion: string,
	relationshipAssertions: AssertionsByFile,
	benchAssertions: AssertionsByFile
]

let assertionEntries: VersionedAssertionsByFile[] | undefined
export const getCachedAssertionEntries = (): VersionedAssertionsByFile[] => {
	if (!assertionEntries) {
		const config = getConfig()
		if (!existsSync(config.assertionCacheDir))
			throwMissingAssertionDataError(config.assertionCacheDir)

		const assertionFiles = readdirSync(config.assertionCacheDir)
		const relationshipAssertions: AssertionsByFile = {}
		const benchAssertions: AssertionsByFile = {}

		assertionEntries = assertionFiles.map(file => {
			const data = readJson(join(config.assertionCacheDir, file))
			for (const fileName of Object.keys(data)) {
				const relationshipAssertionData = data[fileName].filter(
					(entry: TypeAssertionData) => "args" in entry
				)
				const benchAssertionData = data[fileName].filter(
					(entry: TypeAssertionData) => "count" in entry
				)
				relationshipAssertions[fileName] = relationshipAssertionData
				benchAssertions[fileName] = benchAssertionData
			}
			return [
				// remove .json extension
				file.slice(0, -5),
				relationshipAssertions,
				benchAssertions
			]
		})
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
	if (line < start.line || line > end.line) return false

	if (line === start.line) return char >= start.char

	if (line === end.line) return char <= end.char

	return true
}

export type VersionedTypeAssertion<
	data extends TypeAssertionData = TypeAssertionData
> = [tsVersion: string, assertionData: data]

enum Assertion {
	Bench,
	Type
}

const getTypeAssertionsAtPosition = <T extends TypeAssertionData>(
	position: SourcePosition,
	assertionType: Assertion
): VersionedTypeAssertion<T>[] => {
	const fileKey = getFileKey(position.file)
	return getCachedAssertionEntries().map(
		([version, typeRelationshipAssertions, BenchAssertionAssertions]) => {
			const assertions =
				assertionType === Assertion.Type ?
					typeRelationshipAssertions
				:	BenchAssertionAssertions
			if (!assertions[fileKey]) {
				throw new Error(
					`Found no assertion data for '${fileKey}' for TypeScript version ${version}.`
				)
			}
			const matchingAssertion = assertions[fileKey].find(assertion => {
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
			return [version, matchingAssertion] as VersionedTypeAssertion<T>
		}
	)
}

export const getTypeRelationshipAssertionsAtPosition = (
	position: SourcePosition
): VersionedTypeAssertion<TypeRelationshipAssertionData>[] => {
	return getTypeAssertionsAtPosition<TypeRelationshipAssertionData>(
		position,
		Assertion.Type
	)
}

export const getTypeBenchAssertionsAtPosition = (
	position: SourcePosition
): VersionedTypeAssertion<TypeBenchmarkingAssertionData>[] => {
	return getTypeAssertionsAtPosition<TypeBenchmarkingAssertionData>(
		position,
		Assertion.Bench
	)
}