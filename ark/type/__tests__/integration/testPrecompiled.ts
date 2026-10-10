// loaded before arktype so DynamicFunction extends the proxy
import { evaluatedBodies } from "./csp.ts"
import "./jitlessConfig.ts"

import { hasArkKind } from "@ark/schema"
import { deepStrictEqual, strictEqual } from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import {
	corpus,
	isPrecompiled,
	observe,
	precompile,
	registerUnits
} from "./precompiled.ts"
import { cases } from "./util.ts"

// registered before arktype is imported, as the module its build writes is
const keywordUnits = await registerUnits(
	JSON.parse(
		execFileSync(
			"node",
			[
				fileURLToPath(
					new URL("../../../repo/precompileKeywords.ts", import.meta.url)
				)
			],
			{ encoding: "utf8" }
		)
	)
)

const { keywords, scope } = await import("arktype")

const interpreted = corpus.map(([def]) => scope({}).type(def as never))

const units = await precompile(interpreted)

const unboundKeywordsOf = (module: object, path: string): string[] =>
	Object.entries(module).flatMap(([k, resolution]) =>
		hasArkKind(resolution, "module") ?
			unboundKeywordsOf(resolution, `${path}${k}.`)
		: (
			hasArkKind(resolution, "root") &&
			!resolution.includesAlias &&
			!isPrecompiled(keywordUnits, resolution) &&
			// the corpus registers again the units it shares with keywords
			!isPrecompiled(units, resolution)
		) ?
			[`${path}${k}`]
		:	[]
	)

cases({
	bindsEveryAcyclicKeyword: () => {
		deepStrictEqual(unboundKeywordsOf(keywords, ""), [])
	},
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
