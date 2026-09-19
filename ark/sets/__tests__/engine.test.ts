import { attest, contextualize } from "@ark/attest"
import {
	$ark,
	bootstrap,
	rootSchema,
	writeMissingSetEngineMessage
} from "@ark/schema"
import { setEngine } from "arksets"

contextualize(() => {
	// as in any process that imports arksets before it parses, the language
	// is bootstrapped with the engine installed
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
				writeMissingSetEngineMessage("intersect")
			)
		)
	})

	it("parsing does not", () => {
		withoutEngine(() => {
			const T = rootSchema(["number", { unit: 1 }])
			attest(T.kind).equals("union")
			attest(T.expression).snap("number | 1")
		})
		attest(rootSchema(["number", { unit: 1 }]).expression).snap("number")
	})
})
