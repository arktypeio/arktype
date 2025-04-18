import { attest, contextualize } from "@ark/attest"
import { writeLiteralUnionEntriesMessage } from "@ark/schema"
import { register, type array } from "@ark/util"
import { type } from "arktype"
import type { BaseTypeProp } from "arktype/internal/methods/object.ts"

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

		const sReference = register(s)
		const s2 = Symbol()
		const s2Reference = register(s2)
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
			{ kind: "required", key: `Symbol(${sReference})`, value: "1" },
			{ kind: "required", key: "foo", value: "3" },
			{ kind: "optional", key: `Symbol(${s2Reference})`, value: "2" },
			{ kind: "optional", key: "foo2", value: "4" }
		])
	})

	it("union", () => {
		const T = type({ foo: "string" }).or({ bar: "number" })
		attest(() => T.props).throws(writeLiteralUnionEntriesMessage(T.expression))
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
})
