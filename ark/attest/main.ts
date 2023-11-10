export { setup, cleanup } from "./tsserver/cacheAssertions.ts"
export { attest } from "./assert/attest.ts"
export { bench } from "./bench/bench.ts"
export { getTsVersionUnderTest } from "./utils.ts"
export type {
	SerializedArgAssertion,
	SerializedAssertionData,
	LinePositionRange,
	TypeRelationship
} from "./tsserver/getAssertionsInFile.ts"
export { getArgTypesAtPosition } from "./tsserver/getArgTypesAtPosition.ts"
export { type AttestConfig, getDefaultAttestConfig } from "./config.ts"
export { caller, type CallerOfOptions } from "@arktype/fs"
