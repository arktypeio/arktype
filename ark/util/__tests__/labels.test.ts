import { attest } from "@ark/attest"
import type { applyElementLabels } from "@ark/util"

describe("labels", () => {
	it("same length", () => {
		const t = {} as applyElementLabels<[1, 2], [a: "a", b: "b"]>
		attest(t).type.toString("[a: 1, b: 2]")
	})

	it("single optional element", () => {
		const t = {} as applyElementLabels<[1?], [a: "a", b: "b"]>
		attest(t).type.toString("[a?: 1]")
	})

	it("two elements with the second one optional", () => {
		const t = {} as applyElementLabels<[1, 2?], [a: "a", b: "b"]>
		attest(t).type.toString("[a: 1, b?: 2]")
	})

	it("three elements with the third one optional", () => {
		const t = {} as applyElementLabels<[1, 2, 3?], [a: "a", b: "b"]>
		attest(t).type.toString("[a: 1, b: 2, 3?]")
	})

	it("optional first element and variadic elements", () => {
		const t = {} as applyElementLabels<[1?, ...0[]], [a: "a", b: "b"]>
		attest(t).type.toString("[a?: 1, b?: 0, ...0[]]")
	})

	it("two elements with the second one optional and variadic elements", () => {
		const t = {} as applyElementLabels<[1, 2?, ...0[]], [a: "a", b: "b"]>
		attest(t).type.toString("[a: 1, b?: 2, ...0[]]")
	})

	it("extra labels with rest", () => {
		const t = {} as applyElementLabels<string[], [a: "a", b: "b", c: "c"]>
		attest(t).type.toString("[a?: string, b?: string, c?: string, ...string[]]")
	})
})
