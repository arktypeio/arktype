/// <reference lib="es2021.weakref" />
import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"
import { setFlagsFromString } from "node:v8"
import { runInNewContext } from "node:vm"

setFlagsFromString("--expose-gc")
const gc: () => void = runInNewContext("gc")

const nextJob = () => new Promise(resolve => setTimeout(resolve, 0))

// a WeakRef's target is kept until the job that created or read it ends, and
// a FinalizationRegistry calls back only between jobs
const collect = async () => {
	await nextJob()
	gc()
	await nextJob()
}

contextualize(() => {
	it("collects a type nothing references", async () => {
		const ref = new WeakRef(type({ collected: "string", n: "number > 5" }))
		await collect()
		attest(ref.deref()).equals(undefined)
		const T = type({ collected: "string", n: "number > 5" })
		attest(T({ collected: "a", n: 6 })).equals({ collected: "a", n: 6 })
		attest(T({ collected: "a", n: 5 }).toString()).snap(
			"n must be more than 5 (was 5)"
		)
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
		// a scope caches the union on its first parse
		const $ = scope({})
		$.type("string")
		await collect()
		attest(
			$.type(
				"string | number | bigint | symbol | object | boolean | null | undefined"
			).expression
		).equals("unknown")
	})

	it("enumerated returns a union compiled and dropped as compiled", async () => {
		const compiledMessage = type("'zeta' | 'alpha' | 7")(2).toString()
		await collect()
		attest(type.enumerated("zeta", "alpha", 7)(2).toString()).equals(
			compiledMessage
		)
	})

	it("an optional prop's input depends on the same reads after collecting", async () => {
		// how often a defaultable prop's input was read decides whether it keeps
		// its default, so reading one type's input and then another's gives
		// the same result whether or not the first type was collected between
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
