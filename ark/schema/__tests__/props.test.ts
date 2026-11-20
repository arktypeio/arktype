import { attest, contextualize } from "@ark/attest"
import {
	copyDeclared,
	mergeTransformed,
	rootSchema,
	setOwnValue,
	writeEnumerableIndexBranches
} from "@ark/schema"
import { hasOwn } from "@ark/util"

const expectSafeProto = (out: object, expectedProtoValue: unknown): void => {
	attest(Object.getPrototypeOf(out)).equals(Object.prototype)
	attest(hasOwn(out, "__proto__")).equals(true)
	attest((out as { hijacked?: unknown }).hijacked).equals(undefined)
	attest(Object.getOwnPropertyDescriptor(out, "__proto__")?.value).equals(
		expectedProtoValue
	)
}

contextualize(() => {
	it("normalizes prop order", () => {
		const L = rootSchema({
			domain: "object",
			required: [
				{ key: "a", value: "string" },
				{ key: "b", value: "number" }
			]
		})
		const R = rootSchema({
			domain: "object",
			required: [
				{ key: "b", value: "number" },
				{ key: "a", value: "string" }
			]
		})
		attest(L.json).equals(R.json)
	})

	it("preserves matching literal", () => {
		const L = rootSchema({
			domain: "object",
			index: [{ signature: "string", value: "string" }],
			undeclared: "reject"
		})

		const R = rootSchema({
			domain: "object",
			required: [{ key: "a", value: { unit: "foo" } }]
		})

		const T = L.and(R)

		attest(T.json).snap({
			undeclared: "reject",
			required: [{ key: "a", value: { unit: "foo" } }],
			index: [{ value: "string", signature: "string" }],
			domain: "object"
		})
	})

	it("preserves matching index", () => {
		const L = rootSchema({
			domain: "object",
			index: [{ signature: "string", value: "string" }],
			undeclared: "reject"
		})

		const R = rootSchema({
			domain: "object",
			index: [{ signature: "string", value: { unit: "foo" } }]
		})

		const T = L.and(R)

		attest(T.json).snap({
			undeclared: "reject",
			index: [{ signature: "string", value: { unit: "foo" } }],
			domain: "object"
		})
	})

	it("enumerable index keys", () => {
		const s = Symbol("s")
		attest(() =>
			rootSchema({
				domain: "object",
				index: { signature: ["string", { unit: s }], value: "string" }
			})
		).throws(writeEnumerableIndexBranches(["Symbol(s)"]))
	})

	const startingWithA = rootSchema({ domain: "string", pattern: /^a.*/ })

	const endingWithZ = rootSchema({ domain: "string", pattern: /.*z$/ })

	const startingWithAAndEndingWithZ = rootSchema({
		domain: "string",
		pattern: [/^a.*/, /.*z$/]
	})

	it("intersects nonsubtype index signatures", () => {
		const L = rootSchema({
			domain: "object",
			index: [{ signature: startingWithA, value: "string" }],
			undeclared: "reject"
		})

		const R = rootSchema({
			domain: "object",
			index: [{ signature: endingWithZ, value: { unit: "foo" } }]
		})

		const Result = L.and(R)

		const Expected = rootSchema({
			domain: "object",
			index: [
				{ signature: startingWithA, value: "string" },
				{ signature: startingWithAAndEndingWithZ, value: { unit: "foo" } }
			],
			undeclared: "reject"
		})

		attest(Result.json).snap(Expected.json)
	})

	it("intersects non-subtype strict index signatures", () => {
		const L = rootSchema({
			domain: "object",
			index: [{ signature: startingWithA, value: endingWithZ }],
			undeclared: "reject"
		})

		const R = rootSchema({
			domain: "object",
			index: [{ signature: endingWithZ, value: startingWithA }],
			undeclared: "reject"
		})

		const Result = L.and(R)

		const Expected = rootSchema({
			domain: "object",
			index: [
				{
					signature: startingWithAAndEndingWithZ,
					value: startingWithAAndEndingWithZ
				}
			],
			undeclared: "reject"
		})

		attest(Result.json).equals(Expected.json)
	})

	it("prunes undeclared optional", () => {
		const L = rootSchema({
			domain: "object",
			required: [{ key: "a", value: "string" }],
			undeclared: "reject"
		})

		const R = rootSchema({
			domain: "object",
			optional: [{ key: "b", value: "number" }]
		})

		const T = L.and(R)

		attest(T.json).snap(L.json)
	})

	it("prunes undeclared index", () => {
		const L = rootSchema({
			domain: "object",
			index: [{ signature: "string", value: "string" }]
		})

		const R = rootSchema({
			domain: "object",
			required: [{ key: "a", value: { unit: "foo" } }],
			undeclared: "reject"
		})

		const T = L.and(R)

		attest(T.json).snap({
			undeclared: "reject",
			required: [{ key: "a", value: { unit: "foo" } }],
			domain: "object"
		})
	})

	it("undeclared required", () => {
		const L = rootSchema({
			domain: "object",
			required: [
				{ key: "a", value: "string" },
				{ key: "b", value: "number" }
			]
		})
		const R = rootSchema({
			domain: "object",
			required: [{ key: "a", value: "string" }],
			undeclared: "reject"
		})

		attest(() => L.and(R)).throws
			.snap(`ParseError: Intersection at b of number and never results in an unsatisfiable type
b is undeclared on a side that rejects undeclared keys.
To add it, use .merge(), which takes "+" from the merged object.`)
	})

	it("delete & reject", () => {
		const L = rootSchema({
			domain: "object",
			required: [{ key: "a", value: "string" }],
			undeclared: "delete"
		})
		const R = rootSchema({
			domain: "object",
			required: [{ key: "a", value: "string" }],
			undeclared: "reject"
		})

		const T = L.and(R)

		attest(T.json).equals(R.json)
	})

	it("throws ParseError for non-primitive invalid Date defaults", () => {
		attest(() =>
			rootSchema({
				domain: "object",
				optional: [{ key: "d", value: Date, default: new Date(Number.NaN) }]
			})
		).throws.snap(
			`ParseError: Non-primitive default for "d" must be specified as a function like () => ({my: 'object'})`
		)
	})

	describe("__proto__ own-property safety", () => {
		it("defines own __proto__ when morphing __proto__ uncompiled and compiled", () => {
			const morphProto = rootSchema({
				in: "object",
				morphs: [() => ({ hijacked: true })]
			})
			const T = rootSchema({
				domain: "object",
				required: [{ key: "__proto__", value: morphProto }]
			})
			// exercise uncompiled first call and compiled JIT path
			for (let i = 0; i < 3; i++)
				expectSafeProto(T.assert({}) as object, { hijacked: true })

			const Deleting = rootSchema({
				domain: "object",
				required: [{ key: "__proto__", value: morphProto }],
				undeclared: "delete"
			})
			for (let i = 0; i < 3; i++) {
				const out = Deleting.assert({ extra: 1 }) as object
				expectSafeProto(out, { hijacked: true })
				attest("extra" in out).equals(false)
			}
		})

		it("preserves non-enumerable own __proto__ without hijacking prototype", () => {
			const makeInput = () => {
				const obj: Record<string, unknown> = { a: "  hi  ", extra: 1 }
				Object.defineProperty(obj, "__proto__", {
					value: { hijacked: true },
					enumerable: false,
					configurable: true,
					writable: true
				})
				return obj
			}
			const trim = rootSchema({
				in: "string",
				morphs: [(s: string) => s.trim()]
			})

			const T = rootSchema({
				domain: "object",
				required: [
					{ key: "a", value: trim },
					{ key: "__proto__", value: "object" }
				]
			})
			for (let i = 0; i < 3; i++) {
				const out = T.assert(makeInput()) as { a: string }
				expectSafeProto(out, { hijacked: true })
				attest(out.a).equals("hi")
			}

			const Deleting = rootSchema({
				domain: "object",
				required: [
					{ key: "a", value: trim },
					{ key: "__proto__", value: "object" }
				],
				undeclared: "delete"
			})
			for (let i = 0; i < 3; i++) {
				const out = Deleting.assert(makeInput()) as { a: string }
				expectSafeProto(out, { hijacked: true })
				attest(out.a).equals("hi")
				attest("extra" in out).equals(false)
			}
		})

		it("does not create own __proto__ when deleting undeclared keys on plain object", () => {
			const T = rootSchema({
				domain: "object",
				required: [{ key: "__proto__", value: "object" }],
				undeclared: "delete"
			})
			for (let i = 0; i < 3; i++) {
				const out = T.assert({ a: 1 }) as object
				attest(Object.getPrototypeOf(out)).equals(Object.prototype)
				attest(hasOwn(out, "__proto__")).equals(false)
				attest(Object.keys(out)).equals([])
			}
		})

		it("keeps prototype intact in setOwnValue, copyDeclared, and mergeTransformed", () => {
			const target = {}
			setOwnValue(target, "__proto__", { hijacked: true })
			expectSafeProto(target, { hijacked: true })

			const customProto = { inherited: true }
			const input = Object.create(customProto) as Record<string, unknown>
			input.extra = 1
			const copied = copyDeclared(
				input,
				["__proto__"],
				["__proto__", customProto, { hijacked: true }]
			)
			attest(Object.getPrototypeOf(copied)).equals(customProto)
			attest(hasOwn(copied, "__proto__")).equals(true)
			attest((copied as { hijacked?: unknown }).hijacked).equals(undefined)
			attest("extra" in copied).equals(false)

			const base = { a: 1 }
			const right = JSON.parse('{"a":1,"__proto__":{"hijacked":true}}')
			const merged = mergeTransformed(base, { a: 2 }, right) as object
			expectSafeProto(merged, { hijacked: true })
		})
	})
})
