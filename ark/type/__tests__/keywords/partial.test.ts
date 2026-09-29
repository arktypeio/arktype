import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"

contextualize(() => {
	it("parsed", () => {
		const types = scope({
			user: {
				name: "string",
				"age?": "number"
			},
			actual: "Partial<user>",
			expected: {
				"name?": "string",
				"age?": "number"
			}
		}).export()

		attest<typeof types.expected.t>(types.actual.t)
		attest(types.actual.expression).equals(types.expected.expression)
	})

	it("chained", () => {
		const T = type({
			"[string]": "number",
			foo: "1",
			"bar?": "1"
		}).partial()

		attest<{
			// really this should just be number for the index signature, seems like a TS bug?
			[x: string]: number | undefined
			foo?: 1
			bar?: 1
		}>(T.t)

		attest(T.expression).snap("{ [string]: number, bar?: 1, foo?: 1 }")
	})

	it("tuple", () => {
		const T = type(["string", "number"]).partial()

		attest<[string?, number?]>(T.t)
		attest(T.expression).snap("[string?, number?]")
		attest(T([])).equals([])
		attest(T(["foo"])).equals(["foo"])
		attest(T({}).toString()).snap("must be an array (was object)")
	})

	it("array is unaffected", () => {
		// like the index signature above, TS unions a variadic element with
		// undefined since it has no way to represent an optional one. in
		// ArkType, optionality is about presence rather than the values an
		// element allows, so the type is unchanged.
		const T = type("string[]").partial()

		attest<(string | undefined)[]>(T.t)
		attest(T.expression).snap("string[]")
		attest(T([undefined]).toString()).snap(
			"value at [0] must be a string (was undefined)"
		)
	})

	it("preserves defaultable elements", () => {
		const T = type(["number = 5"]).partial()

		attest(T.expression).snap("[number = 5]")
	})

	it("postfix element", () => {
		// TS folds postfix elements into the variadic here, which would allow
		// values the original tuple never did
		attest(() =>
			type(["string", "...", "number[]", "boolean"]).partial()
		).throws.snap(
			"ParseError: A postfix required element cannot follow an optional or defaultable element"
		)
	})
})
