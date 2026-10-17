// loaded before arktype so DynamicFunction extends the proxy
import { evaluatedBodies } from "./csp.ts"
import "./jitlessConfig.ts"

import { scope } from "arktype"
import { deepStrictEqual, strictEqual } from "node:assert/strict"
import { corpus, isPrecompiled, observe, precompile } from "./precompiled.ts"
import { cases } from "./util.ts"

const interpreted = corpus.map(([def]) => scope({}).type(def as never))

const units = await precompile(interpreted)

cases({
	matchesTheInterpreter: () => {
		for (let i = 0; i < corpus.length; i++) {
			const T = scope({}).type(corpus[i][0] as never)
			strictEqual(isPrecompiled(units, T.internal), true)
			const interpretedInputs = corpus[i][1]()
			for (const [j, data] of corpus[i][1]().entries()) {
				deepStrictEqual(
					observe(T, data),
					observe(interpreted[i], interpretedInputs[j])
				)
			}
		}
	},
	evaluatesNothing: () => {
		deepStrictEqual(evaluatedBodies, [])
	}
})
