import { attest, contextualize } from "@ark/attest"
import {
	writeDuplicateKeyMessage,
	writeLiteralUnionEntriesMessage,
	writeNonStructuralOperandMessage
} from "@ark/schema"
import { Hkt, type array } from "@ark/util"
import { generic, scope, type, type To } from "arktype"
import type {
	BaseTypeProp,
	DefaultedTypeProp
} from "arktype/internal/variants/object.ts"

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

	it("a value is one Type, keeping the undefined it was given", () => {
		const T = type({
			union: "string | number",
			undefinable: "string | undefined",
			undefined: "undefined",
			unknown: "unknown",
			"optional?": "string",
			"undefinableOptional?": "string | undefined"
		})

		attest<
			array<
				| BaseTypeProp<"required", "union", string | number, {}>
				| BaseTypeProp<"required", "undefinable", string | undefined, {}>
				| BaseTypeProp<"required", "undefined", undefined, {}>
				| BaseTypeProp<"required", "unknown", unknown, {}>
				| BaseTypeProp<"optional", "optional", string, {}>
				| BaseTypeProp<
						"optional",
						"undefinableOptional",
						string | undefined,
						{}
				  >
			>
		>(T.props)

		attest(snapshottableProps(T.props)).snap([
			{ kind: "required", key: "undefinable", value: "string | undefined" },
			{ kind: "required", key: "undefined", value: "undefined" },
			{ kind: "required", key: "union", value: "number | string" },
			{ kind: "required", key: "unknown", value: "unknown" },
			{ kind: "optional", key: "optional", value: "string" },
			{
				kind: "optional",
				key: "undefinableOptional",
				value: "string | undefined"
			}
		])
	})

	it("a defaulted morph has its default", () => {
		const T = type({ a: ["string.numeric.parse", "=", "5"] })

		attest<array<DefaultedTypeProp<"a", (In: string) => To<number>, "5", {}>>>(
			T.props
		)
		attest(T.props.map(p => [p.kind, "default" in p && p.default])).snap([
			["optional", "5"]
		])
	})

	it("default only where a prop has one", () => {
		const T = type({ "a?": "string", b: "number = 5" })

		attest(T.props.map(p => [p.key, "default" in p])).snap([
			["a", false],
			["b", true]
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

	it("orders keys by code unit", () => {
		// a key precedes another it prefixes, even one continuing with a space
		const T = type({ "a b": "string", a: "number" })

		attest(T.expression).snap("{ a: number, a b: string }")
		attest(T({}).toString()).snap(`["a b"] must be a string (was missing)
a must be a number (was missing)`)
		// where JSON escapes a character, its order and the code units' differ
		const keys = type({
			"a\uD800": "1",
			ab: "1",
			"a b": "1",
			"a\t": "1",
			a: "1"
		}).props.map(prop => prop.key)
		attest(keys).equals(["a", "a\t", "a b", "ab", "a\uD800"])
	})

	it("allows by checking arrays and patterns last, never past a narrow", () => {
		const T = type({
			a: "string[]",
			b: /x/,
			c: "number",
			d: type.number.narrow(() => true),
			e: "number"
		})
		const reads: PropertyKey[] = []
		const data = new Proxy(
			{ a: [], b: "x", c: 0, d: 0, e: 0 },
			{ get: (o, k) => (reads.push(k), Reflect.get(o, k)) }
		)
		attest(T.allows(data)).equals(true)
		attest([...new Set(reads)]).equals(["c", "a", "b", "d", "e"])
	})

	it("allows never past a prop reaching a narrow through a cycle", () => {
		const readsOf = (T: { allows: (data: unknown) => boolean }) => {
			const reads: PropertyKey[] = []
			const data = new Proxy(
				{ a: null, m: [], n: 0 },
				{ get: (o, k) => (reads.push(k), Reflect.get(o, k)) }
			)
			attest(T.allows(data)).equals(true)
			return [...new Set(reads)]
		}
		const reaching = scope({
			from: { a: "to | null", m: "string[]", n: "number" },
			to: { "from?": "from", value: type.number.narrow(() => true) }
		}).export()
		attest(readsOf(reaching.from)).equals(["a", "n", "m"])

		const reachingNone = scope({
			from: { a: "to | null", m: "string[]", n: "number" },
			to: { "from?": "from", value: "number" }
		}).export()
		attest(readsOf(reachingNone.from)).equals(["n", "a", "m"])
	})

	it("allows by checking numbers and units, then other primitives, then objects", () => {
		const T = type({
			a: "object",
			b: "'x'",
			c: "number",
			d: "boolean | null",
			e: "string"
		})
		const reads: PropertyKey[] = []
		const data = new Proxy(
			{ a: {}, b: "x", c: 0, d: null, e: "" },
			{ get: (o, k) => (reads.push(k), Reflect.get(o, k)) }
		)
		attest(T.allows(data)).equals(true)
		attest([...new Set(reads)]).equals(["c", "d", "b", "e", "a"])
	})

	it("allows by checking arrays last, never past an alias reaching a narrow", () => {
		const $ = scope({
			narrowed: { a: "string[]", inner: "narrowedInner | null", c: "number" },
			narrowedInner: { outer: "narrowed", d: ["number", ":", () => true] },
			unnarrowed: {
				a: "string[]",
				inner: "unnarrowedInner | null",
				c: "number"
			},
			unnarrowedInner: { outer: "unnarrowed", d: "number" }
		}).export()
		const readsOf = (T: type.Any) => {
			const reads: PropertyKey[] = []
			const data = new Proxy(
				{ a: [], inner: null, c: 0 },
				{ get: (o, k) => (reads.push(k), Reflect.get(o, k)) }
			)
			attest(T.allows(data)).equals(true)
			return [...new Set(reads)]
		}
		attest(readsOf($.narrowed)).equals(["a", "inner", "c"])
		attest(readsOf($.unnarrowed)).equals(["c", "inner", "a"])
	})

	it("union", () => {
		const T = type({ foo: "string" }).or({ bar: "number" })
		attest(() => T.props).throws(writeLiteralUnionEntriesMessage(T.expression))
	})

	it("an array's elements and methods aren't props", () => {
		const T = type("string[]")
		attest<array<never>>(T.props)
		attest(T.props).snap([])

		const Tuple = type(["string", "number?"])
		attest<array<never>>(Tuple.props)
		attest(Tuple.props).snap([])

		const FixedTuple = type(["string", "number"])
		attest<array<never>>(FixedTuple.props)
		attest(FixedTuple.props).snap([])

		const TupleWithKey = type(["string", "number"]).and({ foo: "string" })
		attest<array<BaseTypeProp<"required", "foo", string, {}>>>(
			TupleWithKey.props
		)
		attest<"foo">(TupleWithKey.props[0].key)
		attest(snapshottableProps(TupleWithKey.props)).snap([
			{ kind: "required", key: "foo", value: "string" }
		])

		const OptionalTupleWithKey = type(["string", "number?"]).and({
			foo: "string"
		})
		attest<array<BaseTypeProp<"required", "foo", string, {}>>>(
			OptionalTupleWithKey.props
		)
		attest(snapshottableProps(OptionalTupleWithKey.props)).snap([
			{ kind: "required", key: "foo", value: "string" }
		])

		const VariadicTupleWithKey = type(["string", "...", "number[]"]).and({
			foo: "string"
		})
		attest<array<BaseTypeProp<"required", "foo", string, {}>>>(
			VariadicTupleWithKey.props
		)
		attest(snapshottableProps(VariadicTupleWithKey.props)).snap([
			{ kind: "required", key: "foo", value: "string" }
		])

		const ReadonlyTupleWithKey = type(["string", "number"])
			.readonly()
			.and({ foo: "string" })
		attest<array<BaseTypeProp<"required", "foo", string, {}>>>(
			ReadonlyTupleWithKey.props
		)
		attest(snapshottableProps(ReadonlyTupleWithKey.props)).snap([
			{ kind: "required", key: "foo", value: "string" }
		])

		const EmptyTupleWithKey = type([]).and({ foo: "string" })
		attest<array<BaseTypeProp<"required", "foo", string, {}>>>(
			EmptyTupleWithKey.props
		)
		attest(snapshottableProps(EmptyTupleWithKey.props)).snap([
			{ kind: "required", key: "foo", value: "string" }
		])

		const WithKey = type("string[]").and({ foo: "string" })
		attest<array<BaseTypeProp<"required", "foo", string, {}>>>(WithKey.props)
		attest<"foo">(WithKey.props[0].key)
		attest(snapshottableProps(WithKey.props)).snap([
			{ kind: "required", key: "foo", value: "string" }
		])

		const WithZeroLength = type("string[]").and({ length: "0" })
		attest<array<BaseTypeProp<"required", "length", 0, {}>>>(
			WithZeroLength.props
		)
		attest(snapshottableProps(WithZeroLength.props)).snap([
			{ kind: "required", key: "length", value: "0" }
		])

		const WithLength = type("string[]").and({ length: "1" })
		attest<array<BaseTypeProp<"required", "length", 1, {}>>>(WithLength.props)
		attest(snapshottableProps(WithLength.props)).snap([
			{ kind: "required", key: "length", value: "1" }
		])

		const WithBoth = type("string[]").and({ foo: "string", length: "1" })
		attest<"foo" | "length">(WithBoth.props[0].key)
		attest(snapshottableProps(WithBoth.props)).snap([
			{ kind: "required", key: "foo", value: "string" },
			{ kind: "required", key: "length", value: "1" }
		])

		const D = type("Date")
		attest<array<never>>(D.props)
		attest(D.props).snap([])

		const DateWithKey = type("Date").and({ foo: "string" })
		attest<array<BaseTypeProp<"required", "foo", string, {}>>>(
			DateWithKey.props
		)
		attest(snapshottableProps(DateWithKey.props)).snap([
			{ kind: "required", key: "foo", value: "string" }
		])

		const BrandedArray = type("string[]#Tags")
		attest<array<never>>(BrandedArray.props)
		attest(BrandedArray.props).snap([])

		const BrandedDate = type("Date#Created")
		attest<array<never>>(BrandedDate.props)
		attest(BrandedDate.props).snap([])

		const BrandedObj = type({ a: "string" }).brand("User")
		attest<array<BaseTypeProp<"required", "a", string, {}>>>(BrandedObj.props)
		attest(snapshottableProps(BrandedObj.props)).snap([
			{ kind: "required", key: "a", value: "string" }
		])
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

	it("duplicate key as a number and a string", () => {
		attest(() =>
			type.schema({
				domain: "object",
				required: [
					{ key: 1 as never, value: "string" },
					{ key: "1", value: "number" }
				]
			})
		).throws(writeDuplicateKeyMessage("1"))
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

	it("compiled code reads the first key before checking data is an object", () => {
		const T = type({ a: "number", b: "string" })
		// the first data is checked uncompiled
		T.allows({ a: 0, b: "" })
		const reads: PropertyKey[] = []
		const data = new Proxy(
			{ a: 0, b: "" },
			{ get: (o, k) => (reads.push(k), Reflect.get(o, k)) }
		)
		attest(T.allows(data)).equals(true)
		attest(reads).equals(["a", "a", "b"])
	})

	it("rejects a primitive whose wrapper has its keys", () => {
		const T = type({ length: "number" })
		const Strict = type({ "+": "reject", length: "number" })
		// the first data is checked uncompiled
		attest(T.allows({ length: 0 })).equals(true)
		attest(Strict.allows({ length: 0 })).equals(true)
		attest(T.allows("abc")).equals(false)
		attest(Strict.allows("abc")).equals(false)
	})

	it("accepts an object without Object.prototype in its chain", () => {
		const T = type({ length: "number" })
		const unprototyped = Object.assign(Object.create(null), { length: 0 })
		// the first data is checked uncompiled
		attest(T.allows(unprototyped)).equals(true)
		attest(T.allows(unprototyped)).equals(true)
	})

	it("compiled code reads a required morph's key without asking whether data has it", () => {
		const T = type({ count: "string.numeric.parse", id: "number" })
		const asked: PropertyKey[] = []
		const data = new Proxy(
			{ count: "1", id: 1 },
			{ has: (o, k) => asked.push(k) > 0 && k in o }
		)
		// the first data is checked uncompiled
		T.allows(data)
		asked.length = 0
		attest(T.allows(data)).equals(true)
		attest(asked).equals([])
		attest(T.allows({ id: 1 })).equals(false)
		attest(T.allows("1")).equals(false)
	})

	describe("missing", () => {
		const requiredError = (T: type.Any, data: object = {}) => {
			const error = (T(data) as type.errors).issues[0]
			if (error.code !== "required") throw new Error(`${error.code} error`)
			return error
		}

		it("has what the value should have been and its meta", () => {
			const $ = scope({})
			const T = $.type({
				name: $.type("string").configure({ title: "Name" })
			})
			const error = requiredError(T)
			attest(error.message).snap("must be a string (was missing)")
			attest(error.missing).snap({
				code: "domain",
				description: "a string",
				meta: { title: "Name" },
				domain: "string"
			})
			attest(error.valueMeta).equals({ title: "Name" })
			attest(Object.isFrozen(error.missing)).equals(true)
			attest(requiredError(T).missing).is(error.missing)
		})

		it("keeps the branches and bases of the value", () => {
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
			attest(missing("Date")).snap({
				code: "proto",
				description: "a Date",
				meta: {},
				proto: "Function(Date)"
			})
			attest(missing(type("'x'").describe("an x"))).snap({
				code: "unit",
				description: "an x",
				meta: { description: "an x" },
				unit: "x"
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
					code: "required",
					path: ["amount"],
					expected: "0n or 1n",
					message: "must be 0n or 1n (was missing)"
				}
			])
		})

		// https://github.com/arktypeio/arktype/issues/1789
		it("uses a value's authored description when missing", () => {
			const Thing = type({
				a: type("string").describe("foo"),
				b: ["string", "@", "bar"]
			})
			attest(Thing.array()([{}, { a: 1, b: 2 }]).toString()).snap(
				`[0].a must be foo (was missing)
[0].b must be bar (was missing)
[1].a must be foo
[1].b must be bar`
			)

			const Cases = type({
				constrained: type("string > 3").describe("a username"),
				selfConstrained: type("string > 3").describe("a handle", "self"),
				union: type("string | number").describe("an id"),
				selfUnion: type("string | number").describe("a key", "self"),
				branchDescribed: type("string").describe("a code").or("number"),
				unknown: type("unknown").describe("any payload"),
				obj: type({ x: "number" }).describe("a point"),
				keywordOverridden: type("string.email").describe("a work email"),
				date: type("Date").describe("a birthday"),
				morph: type("string")
					.pipe(s => s.length)
					.describe("a length"),
				labeled: type("string").describe("a username").label("Username"),
				messaged: type("string")
					.describe("a username")
					.message("Enter a username"),
				// built-in keywords without user descriptions stay unchanged
				email: "string.email",
				int: "number.integer",
				epoch: "number.epoch"
			})
			attest(Cases({}).toString()).snap(
				`constrained must be a username (was missing)
selfConstrained must be a handle (was missing)
union must be an id (was missing)
selfUnion must be a key (was missing)
branchDescribed must be a number or a code (was missing)
unknown must be any payload (was missing)
obj must be a point (was missing)
keywordOverridden must be a work email (was missing)
date must be a birthday (was missing)
morph must be a length (was missing)
Username must be a username (was missing)
messaged: Enter a username
email must be a string (was missing)
int must be a number (was missing)
epoch must be a number (was missing)`
			)

			// outer "self" description overrides a described basis
			const Outer = type("string")
				.describe("inner desc")
				.moreThanLength(3)
				.describe("outer desc", "self")
			attest(type({ a: Outer })({}).toString()).snap(
				"a must be outer desc (was missing)"
			)

			// described recursive alias
			const Rec = scope({
				Node: { value: "string", next: ["Node", "@", "the next node"] }
			}).export()
			attest(Rec.Node({}).toString()).snap(
				`value must be a string (was missing)
next must be the next node (was missing)`
			)
		})
	})
})
