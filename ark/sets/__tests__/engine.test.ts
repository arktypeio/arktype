import { attest, contextualize } from "@ark/attest"
import {
	$ark,
	bootstrap,
	missingSetEngineMessage,
	rootSchema,
	schemaScope,
	writeDuplicateKeyMessage
} from "@ark/schema"
import { setEngine } from "arksets"

contextualize(() => {
	// bootstrap with the engine installed, as when arksets is imported first
	bootstrap()

	const withoutEngine = (test: () => void) => {
		delete $ark.sets
		try {
			test()
		} finally {
			$ark.sets = setEngine
		}
	}

	it("installed on import", () => {
		attest($ark.sets === setEngine).equals(true)
	})

	it("relational operations require it", () => {
		withoutEngine(() =>
			attest(() => rootSchema("string").and("number")).throws(
				missingSetEngineMessage
			)
		)
	})

	it("json schema generation requires it", () => {
		withoutEngine(() =>
			attest(() => rootSchema("string").toJsonSchema()).throws(
				missingSetEngineMessage
			)
		)
	})

	it("parsing does not", () => {
		withoutEngine(() => {
			const T = rootSchema(["number", { unit: 1 }])
			attest(T.kind).equals("union")
			attest(T.expression).snap("number | 1")
			attest(T.assertHasKind("union").discriminant).equals(null)
			attest(T.allows(1)).equals(true)
			attest(T.allows("x")).equals(false)
		})
		attest(rootSchema(["number", { unit: 1 }]).expression).snap("number")
	})

	it("parsing a tuple with no length bound does not", () => {
		withoutEngine(() => {
			const T = rootSchema({
				proto: Array,
				sequence: {
					defaultables: [["string", "a"]],
					optionals: ["string"],
					variadic: "number"
				}
			})
			attest(T([])).equals(["a"])
			attest(String(T(["b", 1]))).equals(
				"value at [1] must be a string (was a number)"
			)
		})
	})

	it("parses again what was parsed before it", () => {
		const def = [
			{
				domain: "object",
				required: [{ key: "lateKind", value: { unit: "a" } }]
			},
			{
				domain: "object",
				required: [{ key: "lateKind", value: { unit: "b" } }]
			}
		] as const
		withoutEngine(() =>
			attest(rootSchema(def).assertHasKind("union").discriminant).equals(null)
		)
		attest(rootSchema(def).assertHasKind("union").discriminant?.path).equals([
			"lateKind"
		])
	})

	it("parsing what only it validates does", () => {
		withoutEngine(() => {
			attest(() =>
				rootSchema({ proto: Array, sequence: { prefix: ["string"] } })
			).throws(missingSetEngineMessage)
			attest(() =>
				rootSchema([
					{ in: "string", morphs: [(s: string) => s.trim()] },
					"string"
				])
			).throws(missingSetEngineMessage)
			attest(() =>
				schemaScope({}, { exactOptionalPropertyTypes: false }).schema({
					domain: "object",
					optional: [{ key: "a", value: "string" }]
				})
			).throws(missingSetEngineMessage)
		})
	})

	it("parsing rejects duplicate keys without it", () => {
		withoutEngine(() =>
			attest(() =>
				rootSchema({
					domain: "object",
					required: [{ key: "a", value: "string" }],
					optional: [{ key: "a", value: "number" }]
				})
			).throws(writeDuplicateKeyMessage("a"))
		)
	})
})
