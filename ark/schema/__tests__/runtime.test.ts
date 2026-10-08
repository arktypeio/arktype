import { attest, contextualize } from "@ark/attest"
import { $ark, type ArkErrorCode } from "@ark/schema"
import { resolvedConfig } from "@ark/schema/runtime"
import { hasDomain } from "@ark/util"

const writerKeys = ["expected", "actual", "problem", "message"] as const

contextualize(() => {
	it("writes errors with each kind's writers", () => {
		const differing: string[] = []
		for (const code in resolvedConfig) {
			const runtimeWriters = resolvedConfig[code as ArkErrorCode]
			if (!hasDomain(runtimeWriters, "object")) continue
			for (const k of writerKeys) {
				if (runtimeWriters[k] !== $ark.defaultConfig[code as ArkErrorCode][k])
					differing.push(`${code} ${k}`)
			}
		}
		// a kind without its own expected describes its node, and a discriminant
		// its cases, where the runtime reads the context's description
		attest(differing).equals([
			"after expected",
			"before expected",
			"divisor expected",
			"domain expected",
			"exactLength expected",
			"max expected",
			"maxLength expected",
			"min expected",
			"minLength expected",
			"pattern expected",
			"proto expected",
			"unit expected",
			"discriminant expected"
		])
	})
})
