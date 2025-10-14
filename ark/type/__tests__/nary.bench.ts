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
}).types([1140, "instantiations"])

bench("or-chained(2)", () => {
	type.or({ a1: "1" }).or({ a2: "2" })
}).types([1940, "instantiations"])

bench("or(5)", () => {
	type.or({ a1: "1" }, { a2: "2" }, { a3: "3" }, { a4: "4" }, { a5: "5" })
}).types([4546, "instantiations"])

bench("or-chained(5)", () => {
	type
		.or({ a1: "1" })
		.or({ a2: "2" })
		.or({ a3: "3" })
		.or({ a4: "4" })
		.or({ a5: "5" })
}).types([5159, "instantiations"])

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
}).types([9099, "instantiations"])

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
}).types([11497, "instantiations"])

bench("and(2)", () => {
	type.and({ a1: "1" }, { a2: "2" })
}).types([1358, "instantiations"])

bench("and-chained(2)", () => {
	type.and({ a1: "1" }).and({ a2: "2" })
}).types([2304, "instantiations"])

bench("and(5)", () => {
	type.and({ a1: "1" }, { a2: "2" }, { a3: "3" }, { a4: "4" }, { a5: "5" })
}).types([7456, "instantiations"])

bench("and-chained(5)", () => {
	type
		.and({ a1: "1" })
		.and({ a2: "2" })
		.and({ a3: "3" })
		.and({ a4: "4" })
		.and({ a5: "5" })
}).types([6918, "instantiations"])

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
}).types([17614, "instantiations"])

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
}).types([17341, "instantiations"])

bench("merge(2)", () => {
	type.merge({ a1: "1" }, { a2: "2" })
}).types([1209, "instantiations"])

bench("merge-chained(2)", () => {
	type.merge({ a1: "1" }).merge({ a2: "2" })
}).types([1957, "instantiations"])

bench("merge(5)", () => {
	type.merge({ a1: "1" }, { a2: "2" }, { a3: "3" }, { a4: "4" }, { a5: "5" })
}).types([5305, "instantiations"])

bench("merge-chained(5)", () => {
	type
		.merge({ a1: "1" })
		.merge({ a2: "2" })
		.merge({ a3: "3" })
		.merge({ a4: "4" })
		.merge({ a5: "5" })
}).types([5113, "instantiations"])

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
}).types([11083, "instantiations"])

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
}).types([11186, "instantiations"])

bench("pipe(2)", () => {
	type.pipe(type.unit("a"), s => `${s}b` as const)
}).types([2727, "instantiations"])

bench("pipe-chained(2)", () => {
	type.unit("a").pipe(s => `${s}b` as const)
}).types([275, "instantiations"])

bench("pipe(5)", () => {
	type.pipe(
		type.unit("a"),
		s => `${s}b` as const,
		s => `${s}c` as const,
		s => `${s}d` as const,
		s => `${s}e` as const
	)
}).types([3470, "instantiations"])

bench("pipe-chained(5)", () => {
	type
		.unit("a")
		.pipe(s => `${s}b` as const)
		.pipe(s => `${s}c` as const)
		.pipe(s => `${s}d` as const)
		.pipe(s => `${s}e` as const)
}).types([1481, "instantiations"])

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
}).types([5085, "instantiations"])

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
}).types([4026, "instantiations"])

bench("fun(0)", () => {
	type.fn(":", { a1: "1" })(() => ({ a1: 1 }))
}).types([1135, "instantiations"])

bench("fun(1, implicit)", () => {
	type.fn({ a1: "1" })(a => a)
}).types([1210, "instantiations"])

bench("fun(1, explicit)", () => {
	type.fn({ a1: "1" }, ":", { a2: "2" })(a => ({ ...a, a2: 2 }))
}).types([2167, "instantiations"])

bench("fun(2)", () => {
	type.fn({ a1: "1" }, { a2: "2" }, ":", { a3: "3" })((a, b) => ({
		...a,
		...b,
		a3: 3
	}))
}).types([3283, "instantiations"])

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
}).types([7012, "instantiations"])

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
}).types([14613, "instantiations"])
