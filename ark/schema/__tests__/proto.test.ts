import { attest, contextualize } from "@ark/attest"
import { node, rootSchema } from "@ark/schema"

contextualize(() => {
	it("reparses a proto's json", () => {
		const d = node("proto", { proto: Date })
		attest(d.json).snap({ proto: "Date" })

		const reparsed = rootSchema(d)
		attest(reparsed.json).equals(d.json)
		attest(reparsed.id).equals(d.id)
	})

	it("can parse proto from string", () => {
		const T = rootSchema({
			domain: "object",
			required: [{ key: "foo", value: "Array" }]
		})

		attest(T).snap({
			required: [{ key: "foo", value: "Array" }],
			domain: "object"
		})

		attest(T.get("foo")).snap({ proto: "Array" })
	})

	it("dateAllowsInvalid on non-Date", () => {
		attest(() =>
			rootSchema({ proto: Map, dateAllowsInvalid: true } as never)
		).throws.snap(
			"ParseError: dateAllowsInvalid may only be specified with constructor Date (was Map)"
		)
	})

	it("disallowing invalid Dates like config is the default", () => {
		const T = rootSchema({ proto: Date, dateAllowsInvalid: false })
		attest(T.json).snap({ proto: "Date" })
		attest(T.equals(rootSchema({ proto: Date }))).equals(true)
	})
})
