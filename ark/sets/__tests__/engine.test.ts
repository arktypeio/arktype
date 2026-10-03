import { attest, contextualize } from "@ark/attest"
import {
	$ark,
	bootstrap,
	missingSetEngineMessage,
	rootSchema,
	schemaScope
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
})
