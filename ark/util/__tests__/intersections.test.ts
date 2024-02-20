import { attest } from "@arktype/attest"
import type {
	initOf,
	intersectArrays,
	intersectParameters
} from "@arktype/util"

describe("intersectParameters", () => {
	it("both empty", () => {
		type t = intersectParameters<[], []>
		attest<[], t>()
	})
	it("one empty", () => {
		type t = intersectParameters<[], [string, number, ...boolean[]]>
		attest<[string, number, ...boolean[]], t>()
	})
	it("longer parameters preserved", () => {
		type t = intersectParameters<["a"], [string, number]>
		attest<["a", number], t>()
	})
	it("objects evaluated", () => {
		type t = intersectParameters<[{ a: string }], [{ b: boolean }]>
		// Snapshotted so that { a: string } & { b: boolean } fails
		attest({} as t).type.toString.snap("[{ a: string; b: boolean; }]")
	})
	it("unknown preserved", () => {
		type t = intersectParameters<[unknown], []>
		// Avoids evaluating unknown to {}
		attest<[unknown], t>()
	})
	it("one optional", () => {
		type t = intersectParameters<[("a" | "b" | "c")?], [string, 1 | 2 | 3]>
		attest<["a" | "b" | "c", 1 | 2 | 3], t>()
	})
	it("both optional", () => {
		type t = intersectParameters<[{ a: 0 }?], [{ b: 1 }?]>
		attest<[{ a: 0; b: 1 }?], t>()
	})
	it("optional+not-present", () => {
		type t = intersectParameters<[{ a: 0 }?], []>
		attest<[{ a: 0 }?], t>()
	})
	it("two non-fixed arrays", () => {
		type t = intersectParameters<{ a: 0 }[], { b: 1 }[]>
		attest<{ a: 0; b: 1 }[], t>()
	})
	it("one non-fixed array", () => {
		type t = intersectParameters<[{ a: 0 }, { b: 1 }], { c: 2 }[]>
		attest<
			[
				{
					a: 0
					c: 2
				},
				{
					b: 1
					c: 2
				},
				...{
					c: 2
				}[]
			],
			t
		>()
	})
	it("one trailing rest", () => {
		type t = intersectParameters<
			[{ a: 0 }, ...{ b: 1 }[]],
			[{ c: 2 }, { d: 3 }]
		>
		attest<
			[
				{
					a: 0
					c: 2
				},
				{
					b: 1
					d: 3
				},
				...{
					b: 1
				}[]
			],
			t
		>()
	})
	it("two trailing rest", () => {
		type t = intersectParameters<
			[{ a: 0 }, ...{ b: 1 }[]],
			[{ c: 2 }, { d: 3 }, ...{ e: 4 }[]]
		>
		attest<
			[
				{
					a: 0
					c: 2
				},
				{
					b: 1
					d: 3
				},
				...{
					b: 1
					e: 4
				}[]
			],
			t
		>()
	})
	it("kitchen sink", () => {
		type t = intersectParameters<
			[{ a: 0 }, { b: 1 }?, { c: 2 }?, ...{ d: 3 }[]],
			[{ e: 4 }?, { f: 5 }?, ...{ g: 6 }[]]
		>
		attest<
			[
				{
					a: 0
					e: 4
				},
				{
					b: 1
					f: 5
				}?,
				{
					c: 2
					g: 6
				}?,
				...{
					d: 3
					g: 6
				}[]
			],
			t
		>()
	})
	it("extra variadic args preserved", () => {
		type t = intersectParameters<["a", "b"], [string, ...string[]]>
		attest<["a", "b", ...string[]], t>()
	})
})

describe("intersectArrays", () => {
	// Ideally this might be reduced to a top-level never
	it("incompatible lengths", () => {
		type t = intersectArrays<[], [string]>
		attest<[never], t>()
	})

	it("extra variadic args truncated", () => {
		type t = intersectArrays<["a", "b"], [string, ...string[]]>
		attest<["a", "b"], t>()
	})

	it("non-trailing variadic elements", () => {
		type t = intersectArrays<
			[...{ a: 0 }[], { f: 6 }, { b: 1 }],
			[{ c: 2 }, { d: 3 }, ...{ e: 4 }[]]
		>

		type Z = [...{ a: 0 }[], { c: 2 }, { b: 1 }]
		type R = initOf<Z>
		attest<
			[
				{
					a: 0
					c: 2
				},
				{
					a: 0
					d: 3
				},
				{
					b: 1
					e: 4
				},
				...{
					e: 4
				}[]
			],
			t
		>()
	})

	it("non-trailing variadic elements with optional", () => {
		type t = intersectArrays<
			[...{ a: 0 }[], { b: 1 }?],
			[{ c: 2 }?, ...{ e: 4 }[]]
		>
		attest<
			[
				{
					a: 0
					c: 2
				}?,
				{
					a: 0
					e: 4
				},
				{
					b: 1
					e: 4
				}?,
				...{
					e: 4
				}[]
			],
			t
		>()
	})
})
