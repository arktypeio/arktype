import { attest, contextualize } from "@ark/attest"
import { node, rootSchema } from "@ark/schema"

contextualize(() => {
	it("normalizes node schema", () => {
		const d = node("proto", Date)
		attest(d.json).snap({ proto: "Date" })

		const reparsed = rootSchema(d)
		attest(reparsed.json).equals(d.json)
		attest(reparsed.id).equals(d.id)
	})
})
