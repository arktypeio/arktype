import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"

contextualize(() => {
	it("preserves the original references if no morphs are present", () => {
		const T = type({
			foo: "string"
		})

		const original = { foo: "bar" }

		const out = T(original)
		attest(out).is(original)
	})

	it("doesn't mutate its input", () => {
		const T = type({
			foo: "string.trim",
			inner: { a: "string", b: "number = 5" }
		})

		const original = { foo: "  bar  ", inner: { a: "a" } }

		const out = T(original)

		attest(out).snap({ foo: "bar", inner: { a: "a", b: 5 } })
		attest(original).snap({ foo: "  bar  ", inner: { a: "a" } })
	})

	it("shares values it doesn't transform", () => {
		const T = type({ a: "string.trim", b: { c: "number[]" } })

		const original = { a: " a ", b: { c: [1] } }

		const out = T.assert(original)

		attest(out).snap({ a: "a", b: { c: [1] } })
		attest(out.b).is(original.b)
	})

	it("transforms a frozen input", () => {
		const T = type({ foo: "string.trim", bar: "number = 5" })

		const original = Object.freeze({ foo: "  bar  " })

		attest(T(original)).snap({ foo: "bar", bar: 5 })
	})

	it("transforms an object at two paths separately", () => {
		const T = type({ a: { v: "string.trim" }, b: { v: "string.trim" } })

		const shared = { v: " x " }

		const out = T.assert({ a: shared, b: shared })

		attest(out).snap({ a: { v: "x" }, b: { v: "x" } })
		attest(out.a === out.b).equals(false)
		attest(shared).snap({ v: " x " })
	})

	it("passes a morph its input", () => {
		const increment = (o: { n: number }) => {
			o.n++
			return o
		}

		const T = type([{ n: "number" }, "=>", increment])

		// a root's first call and later ones apply it alike
		for (let i = 0; i < 2; i++) {
			const original = { n: 1 }
			attest(T(original)).is(original)
			attest(original).snap({ n: 2 })
		}
	})

	it("preserves prototypes", () => {
		const T = type(["Date", "=>", d => d.toISOString()])
		attest(T.from(new Date(2000, 1))).equals("2000-02-01T05:00:00.000Z")
	})

	it("reports a morph's error alike whether or not its input is valid", () => {
		const T = type({
			a: ["string", "=>", (s, ctx) => ctx.error("short")],
			b: "number"
		})

		attest(T({ a: "x", b: 1 }).toString()).snap('a must be short (was "x")')
		attest(T({ a: "x", b: "1" }).toString()).snap(
			'b must be a number (was a string)\na must be short (was "x")'
		)
	})

	it("transforms cyclic data through a cyclic alias once", () => {
		let calls = 0
		const $ = scope({
			node: {
				value: ["string", "=>", s => (calls++, s.trim())],
				"next?": "node"
			}
		})

		const original: { value: string; next?: unknown } = { value: " a " }
		original.next = original

		const out = $.export().node(original) as { value: string; next?: unknown }

		attest(calls).equals(1)
		attest(out.value).equals("a")
		attest(out.next).is(out)
		attest(original.value).equals(" a ")
	})

	describe("undeclared keys", () => {
		it("deletes them in declared order", () => {
			const T = type({ "+": "delete", a: "string", b: "number" })

			const original = { a: "a", b: 1 }

			attest(T(original)).is(original)
			attest(Object.keys(T({ b: 1, c: true, a: "a" }))).equals(["a", "b"])
		})

		// process.env is an exotic object- ensure it is correctly copied
		// https://discord.com/channels/957797212103016458/1116551844710330458
		it("deletes them from process.env", () => {
			const Env = type({
				"+": "delete",
				TZ: "'America/New_York'"
			})

			const originalEnv = { ...process.env }

			const vars = Env(process.env)

			attest(vars).snap({ TZ: "America/New_York" })
			// if process.env is not spread here, the assertion fails apparently
			// because it's an exotic object? seems like a Node bug
			attest({ ...process.env }).equals(originalEnv)
		})
	})
})
