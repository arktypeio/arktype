// loaded before arktype so DynamicFunction extends the proxy
import { evaluatedBodies } from "./csp.ts"
import "./jitlessConfig.ts"

import { scope } from "arktype"
import { deepStrictEqual } from "node:assert/strict"
import { assertMatchesCorpus, corpus, precompileUnits } from "./precompiled.ts"
import { cases } from "./util.ts"

const interpreted = corpus.map(([def]) => scope({}).type(def as never))

const units = await precompileUnits(interpreted)

cases({
	matchesTheInterpreter: () => assertMatchesCorpus(units, interpreted),
	evaluatesNothing: () => {
		deepStrictEqual(evaluatedBodies, [])
	}
})
