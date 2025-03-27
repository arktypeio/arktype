import { attest, contextualize } from "@ark/attest"
import type { DomainNode } from "@ark/schema"
import { type } from "arktype"

contextualize(() => {
	const User = type({
		name: "string",
		platform: "'android' | 'ios'",
		"version?": "number | string"
	})

	it("can select a domain", () => {
		const selected = User.select({
			kind: "domain",
			where: d => d.domain === "string"
		})

		attest<DomainNode[]>(selected).snap([{ domain: "string" }])
	})

	it("can configure based on a selector", () => {
		const ConfiguredUser = User.configure(
			{ description: "A STRING" },
			{
				kind: "domain",
				where: d => d.domain === "string"
			}
		)

		attest(ConfiguredUser).snap({
			required: [
				{ key: "name", value: { domain: "string", meta: "A STRING" } },
				{ key: "platform", value: [{ unit: "android" }, { unit: "ios" }] }
			],
			optional: [
				{
					key: "version",
					value: ["number", { domain: "string", meta: "A STRING" }]
				}
			],
			domain: "object"
		})
	})
})
