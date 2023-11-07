import { attest } from "@arktype/attest"
import type { intersectArrays, intersectParameters } from "@arktype/util"
import { suite, test } from "mocha"

suite("intersectParameters", () => {
	test("both empty", () => {
		type t = intersectParameters<[], []>
		attest<[], t>()
	})
	test("one empty", () => {
		type t = intersectParameters<[], [string, number, ...boolean[]]>
		attest<[string, number, ...boolean[]], t>()
	})
	test("longer parameters preserved", () => {
		type t = intersectParameters<["a"], [string, number]>
		attest<["a", number], t>()
	})
	test("objects evaluated", () => {
		type t = intersectParameters<[{ a: string }], [{ b: boolean }]>
		// Snapshotted so that { a: string } & { b: boolean } fails
		attest({} as t).type.toString.snap("[{ a: string; b: boolean; }]")
	})
	test("unknown preserved", () => {
		type t = intersectParameters<[unknown], []>
		// Avoids evaluating unknown to {}
		attest<[unknown], t>()
	})
	test("one optional", () => {
		type t = intersectParameters<[("a" | "b" | "c")?], [string, 1 | 2 | 3]>
		attest<["a" | "b" | "c", 1 | 2 | 3], t>()
	})
	test("both optional", () => {
		type t = intersectParameters<[{ a: 0 }?], [{ b: 1 }?]>
		attest<[{ a: 0; b: 1 }?], t>()
	})
	test("optional+not-present", () => {
		type t = intersectParameters<[{ a: 0 }?], []>
		attest<[{ a: 0 }?], t>()
	})
	test("two non-fixed arrays", () => {
		type t = intersectParameters<{ a: 0 }[], { b: 1 }[]>
		attest<{ a: 0; b: 1 }[], t>()
	})
	test("one non-fixed array", () => {
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
	test("one trailing rest", () => {
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
	test("two trailing rest", () => {
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
	test("kitchen sink", () => {
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
	test("extra variadic args preserved", () => {
		type t = intersectParameters<["a", "b"], [string, ...string[]]>
		attest<["a", "b", ...string[]], t>()
	})
})

suite("intersectArrays", () => {
	// Ideally this might be reduced to a top-level never
	test("incompatible lengths", () => {
		type t = intersectArrays<[], [string]>
		attest<[never], t>()
	})
	test("extra variadic args truncated", () => {
		type t = intersectArrays<["a", "b"], [string, ...string[]]>
		attest<["a", "b"], t>()
	})
})
