import { attest } from "@arktype/attest"
import { scope, type } from "arktype"

describe("config traversal", () => {
	it("tuple expression", () => {
		const description = "a series of characters"
		const types = scope({
			a: ["string", "@", description],
			b: {
				a: "a"
			}
		}).export()
		attest<string>(types.a.infer)
		attest(types.a.description).equals(description)
		attest(types.a(1).errors?.summary).snap(
			"Must be a series of characters (was number)"
		)
		attest<{ a: string }>(types.b.infer)
		attest(types.b({ a: true }).errors?.summary).snap(
			"a must be a series of characters (was boolean)"
		)
	})
	it("tuple expression at path", () => {
		const description = "the number of dimensions in the monster group"
		const t = type({
			monster: ["196883", "@", description]
		})
		attest<{ monster: 196883 }>(t.infer)
		attest(t.description).equals(description)
		attest(t({ monster: 196882 }).errors?.summary).snap(
			"monster must be the number of dimensions in the monster group (was 196882)"
		)
	})
	it("anonymous type config", () => {
		const t = type(type("true", "@", { description: "unfalse" }))
		attest<true>(t.infer)
		attest(t(false).errors?.summary).snap("Must be unfalse (was false)")
	})
	it("anonymous type config at path", () => {
		const unfalse = type("true", "@", { description: "unfalse" })
		const t = type({ myKey: unfalse })
		attest(t({ myKey: "500" }).errors?.summary).snap(
			`myKey must be unfalse (was "500")`
		)
	})
	it("anonymous type thunk", () => {
		const t = type(() => type("false", "@", { description: "untrue" }))
		attest<false>(t.infer)
		attest(t.description).snap("untrue")
	})
	it("anonymous type thunk at path", () => {
		const t = type({
			myKey: () => type("false", "@", { description: "untrue" })
		})
		attest<{ myKey: false }>(t.infer)
		attest(t({ myKey: true }).errors?.summary).snap(
			"myKey must be untrue (was true)"
		)
	})
	it("applies config to shallow descendants", () => {
		const user = type({
			name: "string",
			age: "number"
		}).describe("a valid user")

		// should give the original error at a path
		attest(
			user({
				name: "david",
				age: true
			}).errors?.summary
		).snap("age must be a number (was boolean)")

		// should give the shallow custom error
		attest(user(null).errors?.summary).snap()
	})
})
