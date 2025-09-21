import { bench } from "@ark/attest"
import { type } from "arktype"

bench.baseline(() => {
	type.or({ foo: "string" }, { bar: "number" })
	type.and({ foo: "string" }, { bar: "number" })
	type.merge({ foo: "string" }, { bar: "number" })
	type.pipe(type({ foo: "string" }), o => o.foo, type.string)
	type.fn({ foo: "string" })(o => ({
		bar: o.foo.length
	}))
	type.fn({ foo: "string" }, ":", { bar: "number" })(o => ({
		bar: o.foo.length
	}))
})

bench("or(2)", () => {
	type.or({ a1: "1" }, { a2: "2" })
}).types([1150, "instantiations"])

bench("or-chained(2)", () => {
	type.or({ a1: "1" }).or({ a2: "2" })
}).types([1952, "instantiations"])

bench("or(5)", () => {
	type.or({ a1: "1" }, { a2: "2" }, { a3: "3" }, { a4: "4" }, { a5: "5" })
}).types([4568, "instantiations"])

bench("or-chained(5)", () => {
	type
		.or({ a1: "1" })
		.or({ a2: "2" })
		.or({ a3: "3" })
		.or({ a4: "4" })
		.or({ a5: "5" })
}).types([5189, "instantiations"])

bench("or(10)", () => {
	type.or(
		{ a1: "1" },
		{ a2: "2" },
		{ a3: "3" },
		{ a4: "4" },
		{ a5: "5" },
		{ a6: "6" },
		{ a7: "7" },
		{ a8: "8" },
		{ a9: "9" },
		{ a10: "10" }
	)
}).types([9141, "instantiations"])

bench("or-chained(10)", () => {
	type
		.or({ a1: "1" })
		.or({ a2: "2" })
		.or({ a3: "3" })
		.or({ a4: "4" })
		.or({ a5: "5" })
		.or({ a6: "6" })
		.or({ a7: "7" })
		.or({ a8: "8" })
		.or({ a9: "9" })
		.or({ a10: "10" })
}).types([11557, "instantiations"])

bench("and(2)", () => {
	type.and({ a1: "1" }, { a2: "2" })
}).types([1370, "instantiations"])

bench("and-chained(2)", () => {
	type.and({ a1: "1" }).and({ a2: "2" })
}).types([2318, "instantiations"])

bench("and(5)", () => {
	type.and({ a1: "1" }, { a2: "2" }, { a3: "3" }, { a4: "4" }, { a5: "5" })
}).types([7522, "instantiations"])

bench("and-chained(5)", () => {
	type
		.and({ a1: "1" })
		.and({ a2: "2" })
		.and({ a3: "3" })
		.and({ a4: "4" })
		.and({ a5: "5" })
}).types([6956, "instantiations"])

bench("and(10)", () => {
	const t = type.and(
		{ a1: "1" },
		{ a2: "2" },
		{ a3: "3" },
		{ a4: "4" },
		{ a5: "5" },
		{ a6: "6" },
		{ a7: "7" },
		{ a8: "8" },
		{ a9: "9" },
		{ a10: "10" }
	)
	// ⛳ Result: 17760 instantiations (under baseline by 98.90%)!
}).types([17760, "instantiations"])

bench("and-chained(10)", () => {
	type
		.and({ a1: "1" })
		.and({ a2: "2" })
		.and({ a3: "3" })
		.and({ a4: "4" })
		.and({ a5: "5" })
		.and({ a6: "6" })
		.and({ a7: "7" })
		.and({ a8: "8" })
		.and({ a9: "9" })
		.and({ a10: "10" })
}).types([17419, "instantiations"])

bench("merge(2)", () => {
	type.merge({ a1: "1" }, { a2: "2" })
}).types([1219, "instantiations"])

bench("merge-chained(2)", () => {
	type.merge({ a1: "1" }).merge({ a2: "2" })
}).types([1971, "instantiations"])

bench("merge(5)", () => {
	type.merge({ a1: "1" }, { a2: "2" }, { a3: "3" }, { a4: "4" }, { a5: "5" })
}).types([5369, "instantiations"])

bench("merge-chained(5)", () => {
	type
		.merge({ a1: "1" })
		.merge({ a2: "2" })
		.merge({ a3: "3" })
		.merge({ a4: "4" })
		.merge({ a5: "5" })
}).types([5145, "instantiations"])

bench("merge(10)", () => {
	type.merge(
		{ a1: "1" },
		{ a2: "2" },
		{ a3: "3" },
		{ a4: "4" },
		{ a5: "5" },
		{ a6: "6" },
		{ a7: "7" },
		{ a8: "8" },
		{ a9: "9" },
		{ a10: "10" }
	)
}).types([11227, "instantiations"])

bench("merge-chained(10)", () => {
	type
		.merge({ a1: "1" })
		.merge({ a2: "2" })
		.merge({ a3: "3" })
		.merge({ a4: "4" })
		.merge({ a5: "5" })
		.merge({ a6: "6" })
		.merge({ a7: "7" })
		.merge({ a8: "8" })
		.merge({ a9: "9" })
		.merge({ a10: "10" })
}).types([11248, "instantiations"])

bench("pipe(2)", () => {
	type.pipe(type.unit("a"), s => `${s}b` as const)
}).types([2789, "instantiations"])

bench("pipe-chained(2)", () => {
	type.unit("a").pipe(s => `${s}b` as const)
}).types([285, "instantiations"])

bench("pipe(5)", () => {
	type.pipe(
		type.unit("a"),
		s => `${s}b` as const,
		s => `${s}c` as const,
		s => `${s}d` as const,
		s => `${s}e` as const
	)
}).types([3560, "instantiations"])

bench("pipe-chained(5)", () => {
	type
		.unit("a")
		.pipe(s => `${s}b` as const)
		.pipe(s => `${s}c` as const)
		.pipe(s => `${s}d` as const)
		.pipe(s => `${s}e` as const)
}).types([1527, "instantiations"])

bench("pipe(10)", () => {
	type.pipe(
		type.unit("a"),
		s => `${s}b` as const,
		s => `${s}c` as const,
		s => `${s}d` as const,
		s => `${s}e` as const,
		s => `${s}f` as const,
		s => `${s}g` as const,
		s => `${s}h` as const,
		s => `${s}i` as const,
		s => `${s}j` as const
	)
}).types([5235, "instantiations"])

bench("pipe-chained(10)", () => {
	type
		.unit("a")
		.pipe(s => `${s}b` as const)
		.pipe(s => `${s}c` as const)
		.pipe(s => `${s}d` as const)
		.pipe(s => `${s}e` as const)
		.pipe(s => `${s}f` as const)
		.pipe(s => `${s}g` as const)
		.pipe(s => `${s}h` as const)
		.pipe(s => `${s}i` as const)
		.pipe(s => `${s}j` as const)
}).types([4132, "instantiations"])

bench("fun(0)", () => {
	type.fn(":", { a1: "1" })(() => ({ a1: 1 }))
}).types([1159, "instantiations"])

bench("fun(1, implicit)", () => {
	type.fn({ a1: "1" })(a => a)
}).types([1240, "instantiations"])

bench("fun(1, explicit)", () => {
	type.fn({ a1: "1" }, ":", { a2: "2" })(a => ({ ...a, a2: 2 }))
}).types([2217, "instantiations"])

bench("fun(2)", () => {
	type.fn({ a1: "1" }, { a2: "2" }, ":", { a3: "3" })((a, b) => ({
		...a,
		...b,
		a3: 3
	}))
}).types([3355, "instantiations"])

bench("fun(5)", () => {
	type.fn(
		{ a1: "1" },
		{ a2: "2" },
		{ a3: "3" },
		{ a4: "4" },
		{ a5: "5" },
		":",
		{ a6: "6" }
	)((a, b, c, d, e) => ({ ...a, ...b, ...c, ...d, ...e, a6: 6 }))
}).types([7150, "instantiations"])

bench("fun(10)", () => {
	type.fn(
		{ a1: "1" },
		{ a2: "2" },
		{ a3: "3" },
		{ a4: "4" },
		{ a5: "5" },
		{ a6: "6" },
		{ a7: "7" },
		{ a8: "8" },
		{ a9: "9" },
		{ a10: "10" },
		":",
		{ a11: "11" }
	)((a, b, c, d, e, f, g, h, i, j) => ({
		...a,
		...b,
		...c,
		...d,
		...e,
		...f,
		...g,
		...h,
		...i,
		...j,
		a11: 11
	}))
}).types([14861, "instantiations"])
