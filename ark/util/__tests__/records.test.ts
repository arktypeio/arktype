import { attest, contextualize } from "@ark/attest"
import {
	enumValues,
	type merge,
	type unionToPropwiseXor,
	type withJsDoc,
	type DynamicBase,
	CastableBase
} from "@ark/util"

contextualize(() => {
	it("identical keys", () => {
		interface Source {
			/** is a foo */
			foo?: string
		}

		interface Target {
			foo: "bar"
		}

		type Result = withJsDoc<Target, Source>

		const result: Result = { foo: "bar" }
		// should have annotation "is a foo"
		const { foo } = result

		attest(foo)

		attest<Result, Target>()
	})

	it("less keys", () => {
		interface Source {
			/** is a foo */
			foo?: string
			bar: number
		}

		interface Target {
			foo: "foo"
		}

		type Result = withJsDoc<Target, Source>

		const result: Result = { foo: "foo" }
		// should have annotation "is a foo"
		const { foo } = result

		attest(foo)

		attest<withJsDoc<Target, Source>, Target>()
	})

	it("more keys", () => {
		interface Source {
			/** is a foo */
			foo?: string
		}

		interface Target {
			foo: "foo"
			baz: "baz"
		}

		type Result = withJsDoc<Target, Source>

		const result: Result = { foo: "foo", baz: "baz" }
		// should have annotation "is a foo"
		const { foo } = result

		attest(foo)

		attest<withJsDoc<Target, Source>, Target>()
	})

	it("requires optional keys on target", () => {
		interface Source {
			/** is a foo */
			foo?: string
		}

		interface Target {
			foo?: "foo"
		}

		type Result = withJsDoc<Target, Source>

		const result: Result = { foo: "foo" }
		// should have annotation "is a foo"
		const { foo } = result

		attest(foo)

		attest<withJsDoc<Target, Source>, { foo: "foo" }>()
	})

	it("merge with index signatures", () => {
		type t = merge<
			{ [k: string]: number | string; foo?: 1; bar: 1 },
			{ [k: string]: number; bar: 0; baz?: 0 }
		>

		attest<
			{
				[x: string]: number
				bar: 0
				baz?: 0
			},
			t
		>()
	})

	it("unionToPropwiseXor", () => {
		type t = unionToPropwiseXor<{ a: 1; b?: 2 } | { c: 3 } | { d?: 4 }>

		attest<
			| {
					a: 1
					b?: 2
					c?: undefined
					d?: undefined
			  }
			| {
					c: 3
					a?: undefined
					b?: undefined
					d?: undefined
			  }
			| {
					d?: 4
					a?: undefined
					b?: undefined
					c?: undefined
			  },
			t
		>()
	})

	it("enumValues", () => {
		const fakeEnum = {
			foo: 1,
			bar: "bar",
			mapped: "MAPPED"
		} as const

		// ts reverse assigns numeric values
		// need to make sure we don't extract them at runtime
		Object.assign(fakeEnum, {
			1: "foo"
		})

		attest<(1 | "bar" | "MAPPED")[]>(enumValues(fakeEnum)).snap([
			1,
			"bar",
			"MAPPED"
		])
	})

	it("DynamicBase assignability", () => {
		let a: DynamicBase<{ foo: 123 }> = { foo: 123 }
		let b: DynamicBase<{ bar: 456 }> = { bar: 456 }

		// @ts-expect-error - Without `Uses` this would succeed.
		a = b

		// @ts-expect-error - Without `Uses` this would succeed.
		b = a

		const c: DynamicBase<{ foo: 123 }> = { foo: 123 }
		const d: DynamicBase<{ foo: number }> = c
	})

	it("CastableBase assignability", () => {
		let a = new CastableBase<{ foo: 123 }>()
		let b = new CastableBase<{ bar: 456 }>()

		// @ts-expect-error - Without `" uses"` this would succeed.
		a = b

		// @ts-expect-error - Without `" uses"` this would succeed.
		b = a

		const c = new CastableBase<{ foo: 123 }>()
		const d: CastableBase<{ foo: number }> = c
	})
})
