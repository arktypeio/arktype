export { caller, type CallerOfOptions } from "@arktype/fs"
export { attest } from "./assert/attest.js"
export { bench } from "./bench/bench.js"
export { getDefaultAttestConfig, type AttestConfig } from "./config.js"
export { cleanup, setup } from "./tsserver/cacheAssertions.js"
export { getAssertionDataAtPosition } from "./tsserver/getAssertionDataAtPosition.js"
export type {
	LinePositionRange,
	SerializedArgAssertion,
	SerializedAssertionData,
	TypeRelationship
} from "./tsserver/getAssertionsInFile.js"
export { getTsVersionUnderTest } from "./utils.js"
