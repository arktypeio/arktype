import { attest, contextualize } from "@arktype/attest"
import type { withJsDoc } from "../records.js"

contextualize(() => {
	it("identical keys", () => {
		interface Source {
			/** is a foo */
			foo?: string
		}

		interface Target {
			foo: "bar"
		}

		type Result = withJsDoc<Target, Source>

		const result: Result = { foo: "bar" }
		// should have annotation "is a foo"
		result.foo

		attest<Result, Target>()
	})

	it("less keys", () => {
		interface Source {
			/** is a foo */
			foo?: string
			bar: number
		}

		interface Target {
			foo: "foo"
		}

		type Result = withJsDoc<Target, Source>

		const result: Result = { foo: "foo" }
		// should have annotation "is a foo"
		result.foo

		attest<withJsDoc<Target, Source>, Target>()
	})

	it("more keys", () => {
		interface Source {
			/** is a foo */
			foo?: string
		}

		interface Target {
			foo: "foo"
			baz: "baz"
		}

		type Result = withJsDoc<Target, Source>

		const result: Result = { foo: "foo", baz: "baz" }
		// should have annotation "is a foo"
		result.foo

		attest<withJsDoc<Target, Source>, Target>()
	})

	it("requires optional keys on target", () => {
		interface Source {
			/** is a foo */
			foo?: string
		}

		interface Target {
			foo?: "foo"
		}

		type Result = withJsDoc<Target, Source>

		const result: Result = { foo: "foo" }
		// should have annotation "is a foo"
		result.foo

		attest<withJsDoc<Target, Source>, { foo: "foo" }>()
	})
})
