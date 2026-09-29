import { attest, contextualize } from "@ark/attest"
import * as schema from "@ark/schema"
import * as runtime from "@ark/schema/runtime"

contextualize(() => {
	it("exports", () => {
		attest(Object.keys(runtime)).equals([
			"$ark",
			"ArkError",
			"ArkErrors",
			"Traversal",
			"TraversalError",
			"arkKind",
			"defaultErrorWriters",
			"describeBranches",
			"hasArkKind",
			"reference",
			"registeredReference",
			"registryName",
			"traverseKey"
		])
	})

	it("exports the main entry's own values", () => {
		const forked = Object.keys(runtime).filter(
			k => runtime[k as never] !== schema[k as never]
		)
		attest(forked).equals([])
	})

	it("errors from the main entry are runtime ArkErrors", () => {
		const errors = schema.rootSchema({ domain: "number", divisor: 2 })(1)
		attest(errors instanceof runtime.ArkErrors).equals(true)
		attest(errors).instanceOf(schema.ArkErrors)
		attest(String(errors)).snap("must be even (was 1)")
	})

	it("describes errors with the default writers", () => {
		const ctx = new runtime.Traversal(1, schema.$ark.resolvedConfig)
		ctx.reject({ code: "min", rule: 5 })
		attest(ctx.errors.summary).snap("must be at least 5 (was 1)")
		attest(runtime.defaultErrorWriters.min).is(schema.$ark.defaultConfig.min)
	})
})
