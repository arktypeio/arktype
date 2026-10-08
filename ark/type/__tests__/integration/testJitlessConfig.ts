// loaded before arktype so DynamicFunction extends the proxy
import { evaluatedBodies } from "./csp.ts"
import "./jitlessConfig.ts"

import { type } from "arktype"
import { deepStrictEqual, strictEqual } from "node:assert/strict"
import { cases } from "./util.ts"

cases({
	evaluatesNothing: () => {
		deepStrictEqual(evaluatedBodies, [])
	},
	validates: () => {
		const O = type({ a: "string" })
		strictEqual(O.precompilation, undefined)
		strictEqual(O({ a: 5 }).toString(), "a must be a string (was a number)")
	}
})
