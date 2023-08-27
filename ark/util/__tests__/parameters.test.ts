import { attest } from "@arktype/attest"
import type { intersectParameters } from "@arktype/util"
import { suite, test } from "mocha"

suite("intersectParameters", () => {
	test("both empty", () => {
		type t = intersectParameters<[], []>
		attest({} as t).typed as []
	})
	test("one empty", () => {
		type t = intersectParameters<[], [string, number, ...boolean[]]>
		attest({} as t).typed as [string, number, ...boolean[]]
	})
	test("objects evaluated", () => {
		type t = intersectParameters<[{ a: string }], [{ b: boolean }]>
		// Snapshotted so that { a: string } & { b: boolean } fails
		attest({} as t).types.toString.snap()
	})
	test("unknown preserved", () => {
		type t = intersectParameters<[unknown], []>
		// Avoids evaluating unknown to {}
		attest({} as t).typed as [unknown]
	})
	test("one optional", () => {
		type t = intersectParameters<[("a" | "b" | "c")?], [string, 1 | 2 | 3]>
		attest({} as t).typed as ["a" | "b" | "c", 1 | 2 | 3]
	})
	test("both optional", () => {
		type t = intersectParameters<[{ a: 0 }?], [{ b: 1 }?]>
		attest({} as t).typed as [{ a: 0; b: 1 }?]
	})
	test("optional+not-present", () => {
		type t = intersectParameters<[{ a: 0 }?], []>
		attest({} as t).typed as [{ a: 0 }?]
	})
	test("two non-fixed arrays", () => {
		type t = intersectParameters<{ a: 0 }[], { b: 1 }[]>
		attest({} as t).typed as { a: 0; b: 1 }[]
	})
	test("one non-fixed array", () => {
		type t = intersectParameters<[{ a: 0 }, { b: 1 }], { c: 2 }[]>
		attest({} as t).typed as [
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
		]
	})
	test("one trailing rest", () => {
		type t = intersectParameters<
			[{ a: 0 }, ...{ b: 1 }[]],
			[{ c: 2 }, { d: 3 }]
		>
		attest({} as t).typed as [
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
		]
	})
	test("two trailing rest", () => {
		type t = intersectParameters<
			[{ a: 0 }, ...{ b: 1 }[]],
			[{ c: 2 }, { d: 3 }, ...{ e: 4 }[]]
		>
		attest({} as t).typed as [
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
		]
	})
	test("kitchen sink", () => {
		type t = intersectParameters<
			[{ a: 0 }, { b: 1 }?, { c: 2 }?, ...{ d: 3 }[]],
			[{ e: 4 }?, { f: 5 }?, ...{ g: 6 }[]]
		>
		attest({} as t).typed as [
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
		]
	})
})
