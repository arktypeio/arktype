export { caller, type CallerOfOptions } from "@arktype/fs"
export { attest } from "./assert/attest.js"
export { bench } from "./bench/bench.js"
export { getTypeAssertionsAtPosition } from "./cache/getCachedAssertions.js"
export type {
	LinePositionRange,
	ArgAssertionData as SerializedArgAssertion,
	TypeAssertionData as SerializedAssertionData,
	TypeRelationship
} from "./cache/writeAssertionCache.js"
export { getDefaultAttestConfig, type AttestConfig } from "./config.js"
export { cleanup, setup, teardown, writeAssertionData } from "./fixtures.js"
export {
	findAttestTypeScriptVersions,
	getPrimaryTsVersionUnderTest
} from "./tsVersioning.js"
