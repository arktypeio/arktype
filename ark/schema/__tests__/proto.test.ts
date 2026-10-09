import { attest, contextualize } from "@ark/attest"
import { node, rootSchema, toJson } from "@ark/schema"

contextualize(() => {
	it("reparses a proto's json", () => {
		const d = node("proto", { proto: Date })
		attest(toJson(d)).snap({ proto: "Date" })

		const reparsed = rootSchema(d)
		attest(toJson(reparsed)).equals(toJson(d))
		attest(reparsed.id).equals(d.id)
	})

	it("can parse proto from string", () => {
		const T = rootSchema({
			domain: "object",
			required: [{ key: "foo", value: "Array" }]
		})

		attest(toJson(T)).snap({
			required: [{ key: "foo", value: "Array" }],
			domain: "object"
		})

		attest(toJson(T.get("foo"))).snap({ proto: "Array" })
	})
})
