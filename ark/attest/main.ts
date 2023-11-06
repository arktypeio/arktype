export { setup, cleanup } from "./tsserver/cacheAssertions.js"
export { attest } from "./assert/attest.js"
export { bench } from "./bench/bench.js"
export { getTsVersionUnderTest } from "./utils.js"
export type {
	SerializedArgAssertion,
	SerializedAssertionData,
	LinePositionRange,
	TypeRelationship
} from "./tsserver/getAssertionsInFile.js"
export { getArgTypesAtPosition } from "./tsserver/getArgTypesAtPosition.js"
export {
	configure,
	type AttestConfig,
	getDefaultAttestConfig
} from "./config.js"
export { caller, type CallerOfOptions } from "@arktype/fs"
