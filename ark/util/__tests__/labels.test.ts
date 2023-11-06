import { attest } from "@arktype/attest"
import { suite, test } from "mocha"
import type { applyElementLabels } from "../labels.js"

suite("labels", () => {
	test("same length", () => {
		const t = {} as applyElementLabels<[1, 2], [a: "a", b: "b"]>
		attest(t).type.toString("[a: 1, b: 2]")
	})

	test("single optional element", () => {
		const t = {} as applyElementLabels<[1?], [a: "a", b: "b"]>
		attest(t).type.toString("[a?: 1]")
	})

	test("two elements with the second one optional", () => {
		const t = {} as applyElementLabels<[1, 2?], [a: "a", b: "b"]>
		attest(t).type.toString("[a: 1, b?: 2]")
	})

	test("three elements with the third one optional", () => {
		const t = {} as applyElementLabels<[1, 2, 3?], [a: "a", b: "b"]>
		attest(t).type.toString("[a: 1, b: 2, 3?]")
	})

	test("optional first element and variadic elements", () => {
		const t = {} as applyElementLabels<[1?, ...0[]], [a: "a", b: "b"]>
		attest(t).type.toString("[a?: 1, b?: 0, ...0[]]")
	})

	test("two elements with the second one optional and variadic elements", () => {
		const t = {} as applyElementLabels<[1, 2?, ...0[]], [a: "a", b: "b"]>
		attest(t).type.toString("[a: 1, b?: 2, ...0[]]")
	})

	test("extra labels with rest", () => {
		const t = {} as applyElementLabels<string[], [a: "a", b: "b", c: "c"]>
		attest(t).type.toString("[a?: string, b?: string, c?: string, ...string[]]")
	})
})
