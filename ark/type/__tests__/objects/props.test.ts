import { attest, contextualize } from "@ark/attest"
import {
	writeDuplicateKeyMessage,
	writeLiteralUnionEntriesMessage,
	writeNonStructuralOperandMessage
} from "@ark/schema"
import { Hkt, type array } from "@ark/util"
import { generic, scope, type } from "arktype"
import type { BaseTypeProp } from "arktype/internal/variants/object.ts"

// by default because of the toJSON method, it wouldn't be clear
// if the snapshotted props were requied or optional
const snapshottableProps = (props: array<BaseTypeProp>) =>
	props.map(p => ({
		kind: p.kind,
		key: p.key,
		value: p.value.expression
	}))

contextualize(() => {
	it("strings", () => {
		const T = type({
			foo: "1",
			bar: "2",
			"baz?": "3"
		})

		attest<
			array<
				| BaseTypeProp<"required", "foo", 1, {}>
				| BaseTypeProp<"required", "bar", 2, {}>
				| BaseTypeProp<"optional", "baz", 3, {}>
			>
		>(T.props)

		attest(snapshottableProps(T.props)).snap([
			{ kind: "required", key: "bar", value: "2" },
			{ kind: "required", key: "foo", value: "1" },
			{ kind: "optional", key: "baz", value: "3" }
		])
	})

	it("mixed keys", () => {
		const s = Symbol()
		const s2 = Symbol()
		const T = type({
			[s]: "1",
			[s2]: ["2", "?"],
			foo: "3",
			foo2: ["4", "?"]
		})

		attest<{
			[s]: 1
			foo: 3
			[s2]?: 2
			foo2?: 4
		}>(T.infer)

		attest(snapshottableProps(T.props)).snap([
			{ kind: "required", key: "foo", value: "3" },
			{ kind: "required", key: "Symbol(symbol)", value: "1" },
			{ kind: "optional", key: "foo2", value: "4" },
			{ kind: "optional", key: "Symbol(symbol)", value: "2" }
		])
	})

	it("union", () => {
		const T = type({ foo: "string" }).or({ bar: "number" })
		attest(() => T.props).throws(writeLiteralUnionEntriesMessage(T.expression))
	})

	it("base object", () => {
		const T = type("object")

		attest<array<never>>(T.props)
		attest(T.props).snap([])
	})

	it("object generic constraint", () => {
		const PropCount = generic(["O", "object"])(
			({ O }) => type.unit(O.props.length),
			class extends Hkt<[object]> {
				declare body: number
			}
		)

		attest(PropCount("object").expression).snap("0")
		attest(PropCount({ foo: "string", bar: "number" }).expression).snap("2")
	})

	it("non-object", () => {
		// @ts-expect-error
		attest(() => type("string").props)
			.throws(writeNonStructuralOperandMessage("props", "string"))
			.type.errors("Property 'props' does not exist")
	})

	it("structural operation removes narrow", () => {
		const T = type({ foo: { key: "string" } })
			.narrow(o => o.foo.key.length > 0)
			.merge({
				foo: "null"
			})

		attest(T({ foo: null })).equals({ foo: null })
		attest(T.json).snap({
			required: [{ key: "foo", value: { unit: null } }],
			domain: "object"
		})
	})

	it("duplicate optional key", () => {
		attest(() =>
			type({
				a: "true",
				"a?": "true"
			})
		).throws(writeDuplicateKeyMessage("a"))
	})

	it("optional key with disjoint index", () => {
		attest(() =>
			type({
				"a?": "string",
				a: "string",
				"[string]": "number"
			})
		).throws(
			"Intersection at a of string and number results in an unsatisfiable type"
		)
	})

	it("allows prototype method names as keys", () => {
		// constructor, hasOwnProperty, toString, etc. are valid object keys
		// and should not be incorrectly flagged as duplicates
		const T = type({
			constructor: "string",
			hasOwnProperty: "number",
			toString: "boolean"
		})

		attest<{
			constructor: string
			hasOwnProperty: number
			toString: boolean
		}>(T.t)
	})

	describe("missing", () => {
		const requiredError = (T: type.Any, data: object = {}) => {
			const error = (T(data) as type.errors).issues[0]
			if (error.code !== "required") throw new Error(`${error.code} error`)
			return error
		}

		it("has what the value should have been and its meta", () => {
			for (const jitless of [false, true]) {
				const $ = scope({}, { jitless })
				const T = $.type({
					name: $.type("string").configure({ title: "Name" })
				})
				const error = requiredError(T)
				attest(error.message).snap("name must be a string (was missing)")
				attest(error.missing).snap({
					code: "domain",
					description: "a string",
					meta: { title: "Name" },
					domain: "string"
				})
				attest(error.valueMeta).equals({ title: "Name" })
				attest(Object.isFrozen(error.missing)).equals(true)
				attest(requiredError(T).missing).is(error.missing)
			}
		})

		it("keeps the branches and bases of the value", () => {
			const o = {}
			const missing = (value: unknown) =>
				requiredError(type({ a: value as never })).missing
			attest(missing("never")).snap({ code: "union", branches: [] })
			attest(missing("unknown")).snap({ code: "intersection" })
			attest(
				missing(
					type("unknown")
						.narrow(() => true)
						.or("string")
				)
			).snap({
				code: "union",
				branches: [
					{
						code: "domain",
						description: "a string",
						meta: {},
						domain: "string"
					},
					{ code: "intersection" }
				]
			})
			attest(missing("boolean")).snap({
				code: "union",
				branches: [
					{ code: "unit", description: "false", meta: {}, unit: false },
					{ code: "unit", description: "true", meta: {}, unit: true }
				]
			})
			attest(missing("string > 3")).snap({
				code: "domain",
				description: "a string",
				meta: {},
				domain: "string"
			})
			attest(missing("Date")).snap({
				code: "proto",
				description: "a Date",
				meta: {},
				proto: "Function(Date)"
			})
			attest(missing(type.unit(o))).snap({
				code: "domain",
				description: "an object",
				meta: {},
				domain: "object"
			})
			attest(missing(type("'x'").describe("an x"))).snap({
				code: "unit",
				description: "an x",
				meta: { description: "an x" },
				unit: "x"
			})
			attest(missing(type("string").pipe(s => s.length))).snap({
				code: "domain",
				description: "a string",
				meta: {},
				domain: "string"
			})
			attest(
				missing(
					type("string")
						.describe("text")
						.pipe(s => s.length)
				)
			).snap({ code: "morph", meta: { description: "text" } })
			const Node = scope({ node: { next: "node | null" } }).export().node
			attest(requiredError(Node).missing).snap({
				code: "union",
				branches: [
					{
						code: "domain",
						description: "an object",
						meta: {},
						domain: "object"
					},
					{ code: "unit", description: "null", meta: {}, unit: null }
				]
			})
		})

		it("serializes without its tree", () => {
			const T = type({ amount: "0n | 1n" })
			attest(JSON.parse(JSON.stringify(T({})))).snap([
				{
					data: {},
					path: ["amount"],
					code: "required",
					missingValueDescription: "0n or 1n",
					meta: {},
					propString: "amount",
					expected: "0n or 1n",
					actual: "missing",
					problem: "must be 0n or 1n (was missing)",
					message: "amount must be 0n or 1n (was missing)"
				}
			])
		})
	})
})
