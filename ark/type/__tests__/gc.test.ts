/// <reference lib="es2021.weakref" />
import { attest, contextualize } from "@ark/attest"
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

// a closure V8 is optimizing is kept until the compile ends, so a type can
// outlive a collection
const collectTarget = async (ref: WeakRef<object>) => {
	for (let i = 0; i < 10 && ref.deref(); i++) await collect()
}

contextualize(() => {
	it("collects a type nothing references", async () => {
		const ref = new WeakRef(type({ collected: "string", n: "number > 5" }))
		await collectTarget(ref)
		attest(ref.deref()).equals(undefined)
		const T = type({ collected: "string", n: "number > 5" })
		attest(T({ collected: "a", n: 6 })).equals({ collected: "a", n: 6 })
		attest(T({ collected: "a", n: 5 }).toString()).snap(
			"n must be more than 5 (was 5)"
		)
	})

	it("collects a scope whose types have defaults", async () => {
		const ref = new WeakRef(
			scope({
				a: { collectedDefault: "string = 'gc'" },
				b: ["string", "number = 1234"]
			}).export().a
		)
		await collectTarget(ref)
		attest(ref.deref()).equals(undefined)
	})

	it("keeps a this-cyclic root another type references", async () => {
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

	it("reduces the union of every domain to unknown", async () => {
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

	// built from nodes rather than strings, whose results the ambient parse cache holds
	it("enumerated returns a union compiled and dropped as compiled", async () => {
		let U: type.Any | null = type({ k: "'gcZeta' | 'gcAlpha'" })
			.get("k")
			.or(type.unit(7007))
		const compiledMessage = U(2).toString()
		U = null
		await collect()
		attest(type.enumerated("gcZeta", "gcAlpha", 7007)(2).toString()).equals(
			compiledMessage
		)
	})

	it("$.node returns a union compiled and dropped as compiled", async () => {
		let U: type.Any | null = type({ a: "string" })
			.get("a")
			.or(type.instanceOf(WeakMap))
		const compiledMessage = U(0).toString()
		U = null
		await collect()
		const U2 = type.$.node("union", [{ domain: "string" }, { proto: WeakMap }])
		attest(String(U2(0))).equals(compiledMessage)
	})

	it("configuring self returns a node compiled and dropped as compiled", async () => {
		const configured = () =>
			type({ a: "string" })
				.get("a")
				.or(type.instanceOf(WeakSet))
				.configure({ examples: ["gc"] }, "self")
		let T: type.Any | null = type(configured())
		const compiledMessage = T(0).toString()
		T = null
		await collect()
		attest(configured()(0).toString()).equals(compiledMessage)
	})

	it("optional prop input is unchanged by collecting", async () => {
		const inputAfterReading = async (collectBetween: boolean) => {
			let First: type.Any | null =
				collectBetween ?
					type({ read: ["number", "=", 5] })
				:	type({ unread: ["number", "=", 5] })
			const firstIn = First.in.expression
			First = null
			if (collectBetween) await collect()
			const Second =
				collectBetween ?
					type({ read: ["number", "=", 5], b: "string" })
				:	type({ unread: ["number", "=", 5], b: "string" })
			return [firstIn, Second.in.expression]
				.join(", ")
				.replace(/unread/g, "read")
		}
		attest(await inputAfterReading(true)).equals(await inputAfterReading(false))
	})
})
