import {
	describeCollapsibleDate,
	envHasCsp,
	flatMorph,
	throwError
} from "@ark/util"
import type { ErrorConfig, ResolvedConfig } from "./config.ts"
import {
	writeActual,
	writeDiscriminantActual,
	writeDomainActual,
	writeIntersectionExpected,
	writeIntersectionProblem,
	writeLengthActual,
	writeMessage,
	writeMinLengthActual,
	writePredicateActual,
	writePredicateExpected,
	writePredicateProblem,
	writeProblem,
	writeProtoActual,
	writeRequiredActual,
	writeRequiredExpected,
	writeUnionExpected,
	writeUnionMessage,
	writeUnionProblem,
	writeUnitProblem
} from "./shared/errorWriters.ts"
import type { ArkErrorCode, ExpectedWriter } from "./shared/errors.ts"
import type { Locale } from "./shared/locale.ts"
import { configureLocale, defaultLocale } from "./shared/render.ts"

export * from "./shared/errors.ts"
export * from "./shared/transform.ts"
export * from "./shared/traversal.ts"
export { isAbsent } from "./shared/utils.ts"
export { arrayIndexMatcher } from "./structure/shared.ts"

// compiled code and the runtime it calls change together, so an artifact runs only on the version it was built for
export const abiVersion = 1

export const assertAbiVersion = (version: number): void => {
	if (version !== abiVersion)
		throwError(writeAbiVersionMismatchMessage(version, abiVersion))
}

// node error contexts carry their descriptions, so expected reads them rather than describing a node
const writeExpected: ExpectedWriter = ctx => ctx.description!

// the writers each code has besides its description
const errorWritersByCode: {
	[code in ArkErrorCode]: ErrorConfig<code>
} = {
	after: { actual: describeCollapsibleDate },
	before: { actual: describeCollapsibleDate },
	divisor: {},
	domain: { actual: writeDomainActual },
	exactLength: { actual: writeLengthActual },
	intersection: {
		expected: writeIntersectionExpected,
		problem: writeIntersectionProblem
	},
	max: {},
	maxLength: { actual: writeLengthActual },
	min: {},
	minLength: { actual: writeMinLengthActual },
	pattern: {},
	predicate: {
		expected: writePredicateExpected,
		actual: writePredicateActual,
		problem: writePredicateProblem
	},
	proto: { actual: writeProtoActual },
	required: { expected: writeRequiredExpected, actual: writeRequiredActual },
	union: {
		expected: writeUnionExpected,
		problem: writeUnionProblem,
		message: writeUnionMessage
	},
	unit: { problem: writeUnitProblem },
	undeclared: { expected: "removed", actual: "" },
	discriminant: { actual: writeDiscriminantActual }
}

// en, as far as the runtime's writers read it
export const runtimeLocale = {
	keywordPhrases: {} as Record<string, Locale.KeywordPhrase>,
	actual: writeActual,
	problem: writeProblem,
	message: writeMessage
}

// unless arktype has resolved its config, which sets the locale itself
if (defaultLocale === undefined)
	configureLocale(undefined, runtimeLocale as never)

// what traversal reads from a config: each error code's writers, and whether ArkError may compile
export const resolvedConfig: ResolvedConfig = {
	...flatMorph(errorWritersByCode, (code, writers) => [
		code,
		{
			expected: writeExpected,
			actual: writeActual,
			problem: writeProblem,
			message: writeMessage,
			...writers
		}
	]),
	jitless: envHasCsp(),
	onFail: null
} as never

export const writeAbiVersionMismatchMessage = <
	artifactVersion extends number,
	runtimeVersion extends number
>(
	artifactVersion: artifactVersion,
	runtimeVersion: runtimeVersion
): writeAbiVersionMismatchMessage<artifactVersion, runtimeVersion> =>
	`This artifact was built for version ${artifactVersion} of arktype's runtime, but version ${runtimeVersion} is installed. Rebuild it with the installed arktype.`

export type writeAbiVersionMismatchMessage<
	artifactVersion extends number,
	runtimeVersion extends number
> = `This artifact was built for version ${artifactVersion} of arktype's runtime, but version ${runtimeVersion} is installed. Rebuild it with the installed arktype.`
