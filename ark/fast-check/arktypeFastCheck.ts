import type { type } from "arktype"
import type * as fc from "fast-check"
import { buildArbitrary } from "./buildArbitrary.ts"
import { initializeContext } from "./fastCheckContext.ts"

// values are generated for the Type's input, which is what they're typed as
export const arkToArbitrary = <t extends type.Any>(
	schema: t
): fc.Arbitrary<t["inferIn"]> => {
	const ctx = initializeContext()

	return buildArbitrary(schema as never, ctx)
}
