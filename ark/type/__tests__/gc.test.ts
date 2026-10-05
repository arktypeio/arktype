import { attest, contextualize } from "@ark/attest"
import { rootSchema } from "@ark/schema"
import { scope, type } from "arktype"
import { setFlagsFromString } from "node:v8"
import { runInNewContext } from "node:vm"

setFlagsFromString("--expose-gc")
const gc: () => void = runInNewContext("gc")

const nextJob = () => new Promise(resolve => setTimeout(resolve, 0))

// WeakRef targets live until their job ends, and finalizers run between jobs
const collect = async () => {
	await nextJob()
	gc()
	await nextJob()
}

// a closure V8 is still optimizing can keep a type alive past a collection
const collectTarget = async (ref: WeakRef<object>) => {
	for (let i = 0; i < 10 && ref.deref(); i++) await collect()
}

contextualize(() => {
	it("unreferenced type", async () => {
		const ref = new WeakRef(type({ collected: "string", n: "number > 5" }))
		await collectTarget(ref)
		attest(ref.deref()).equals(undefined)
		const T = type({ collected: "string", n: "number > 5" })
		attest(T({ collected: "a", n: 6 })).equals({ collected: "a", n: 6 })
		attest(T({ collected: "a", n: 5 }).toString()).snap(
			"n must be more than 5 (was 5)"
		)
	})

	it("scope with defaults", async () => {
		const ref = new WeakRef(
			scope({
				a: { collectedDefault: "string = 'gc'" },
				b: ["string", "number = 1234"]
			}).export().a
		)
		await collectTarget(ref)
		attest(ref.deref()).equals(undefined)
	})

	it("unreferenced schema", async () => {
		const ref = new WeakRef(
			rootSchema({
				domain: "object",
				required: [{ key: "collectedSchema", value: "string" }]
			})
		)
		await collectTarget(ref)
		attest(ref.deref()).equals(undefined)
	})

	it("referenced this-cyclic root", async () => {
		let Root: type.Any | null = type({ name: "string", "next?": "this" })
		const Extended = Root.and({ "id?": "number" })
		Root = null
		await collect()
		attest(
			Extended({ name: "a", next: { name: "b", next: { name: 1 } } }).toString()
		).snap("next.next.name must be a string (was a number)")
	})

	it("keeps cyclic scope types", async () => {
		const $ = scope({ node: { value: "string", "next?": "node" } })
		const types = $.export()
		await collect()
		attest(types.node({ value: "a", next: { value: 1 } }).toString()).snap(
			"next.value must be a string (was a number)"
		)
		attest($.type("node[]")([{ value: "a", next: { value: "b" } }])).equals([
			{ value: "a", next: { value: "b" } }
		])
	})

	it("unknown union after collection", async () => {
		await collect()
		const T = type(
			"string | number | bigint | symbol | object | boolean | null | undefined"
		)
		attest(T.expression).equals("unknown")
		const $ = scope({})
		$.export()
		$.type("string")
		await collect()
		attest(
			$.type(
				"string | number | bigint | symbol | object | boolean | null | undefined"
			).expression
		).equals("unknown")
	})

	// built from nodes, which the parse cache doesn't hold
	it("unfinalized parse after collection", async () => {
		const configured = () =>
			type({ a: "string" })
				.get("a")
				.or(type.instanceOf(WeakSet))
				.configure({ examples: ["gc"] }, "self")
		const cases = [
			[
				() => type({ k: "'gcZeta' | 'gcAlpha'" }).get("k").or(type.unit(7007)),
				() => type.enumerated("gcZeta", "gcAlpha", 7007),
				2
			],
			[
				() => type({ a: "string" }).get("a").or(type.instanceOf(WeakMap)),
				() => type.$.node("union", [{ domain: "string" }, { proto: WeakMap }]),
				0
			],
			[() => type(configured()), configured, 0]
		] as const
		for (const [compiled, unfinalized, input] of cases) {
			let T: type.Any | null = compiled()
			const message = String(T(input))
			T = null
			await collect()
			attest(String(unfinalized()(input))).equals(message)
		}
	})

	it("optional prop input after collection", async () => {
		let First: type.Any | null = type({ read: ["number", "=", 5] })
		attest(First.in.expression).snap("{ read?: number }")
		First = null
		await collect()
		attest(type({ read: ["number", "=", 5], b: "string" }).in.expression).snap(
			"{ b: string, read?: number }"
		)
	})
})
