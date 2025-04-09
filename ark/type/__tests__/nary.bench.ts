import { bench } from "@ark/attest"
import { type } from "arktype"

bench.baseline(() => {
	type.or({ foo: "string" }, { bar: "number" })
	type.and({ foo: "string" }, { bar: "number" })
	type.merge({ foo: "string" }, { bar: "number" })
	type.pipe(type({ foo: "string" }), o => o.foo, type.string)
})

bench("or(2)", () => {
	type.or({ a1: "1" }, { a2: "2" })
}).types([1420, "instantiations"])

bench("or-chained(2)", () => {
	type.or({ a1: "1" }).or({ a2: "2" })
}).types([2379, "instantiations"])

bench("or(5)", () => {
	type.or({ a1: "1" }, { a2: "2" }, { a3: "3" }, { a4: "4" }, { a5: "5" })
}).types([5410, "instantiations"])

bench("or-chained(5)", () => {
	type
		.or({ a1: "1" })
		.or({ a2: "2" })
		.or({ a3: "3" })
		.or({ a4: "4" })
		.or({ a5: "5" })
}).types([6981, "instantiations"])

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
}).types([10838, "instantiations"])

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
}).types([17544, "instantiations"])

bench("and(2)", () => {
	type.and({ a1: "1" }, { a2: "2" })
}).types([2291, "instantiations"])

bench("and-chained(2)", () => {
	type.and({ a1: "1" }).and({ a2: "2" })
}).types([3444, "instantiations"])

bench("and(5)", () => {
	type.and({ a1: "1" }, { a2: "2" }, { a3: "3" }, { a4: "4" }, { a5: "5" })
}).types([29250, "instantiations"])

bench("and-chained(5)", () => {
	type
		.and({ a1: "1" })
		.and({ a2: "2" })
		.and({ a3: "3" })
		.and({ a4: "4" })
		.and({ a5: "5" })
}).types([28399, "instantiations"])

bench("and(10)", () => {
	type.and(
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
}).types([2102490, "instantiations"])

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
}).types([856521, "instantiations"])

bench("merge(2)", () => {
	type.merge({ a1: "1" }, { a2: "2" })
}).types([1726, "instantiations"])

bench("merge-chained(2)", () => {
	type.merge({ a1: "1" }).merge({ a2: "2" })
}).types([2483, "instantiations"])

bench("merge(5)", () => {
	type.merge({ a1: "1" }, { a2: "2" }, { a3: "3" }, { a4: "4" }, { a5: "5" })
}).types([10940, "instantiations"])

bench("merge-chained(5)", () => {
	type
		.merge({ a1: "1" })
		.merge({ a2: "2" })
		.merge({ a3: "3" })
		.merge({ a4: "4" })
		.merge({ a5: "5" })
}).types([10711, "instantiations"])

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
}).types([165349, "instantiations"])

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
}).types([206559, "instantiations"])

bench("pipe(2)", () => {
	type.pipe(type.unit("a"), s => `${s}b` as const)
}).types([3114, "instantiations"])

bench("pipe-chained(2)", () => {
	type.unit("a").pipe(s => `${s}b` as const)
}).types([303, "instantiations"])

bench("pipe(5)", () => {
	type.pipe(
		type.unit("a"),
		s => `${s}b` as const,
		s => `${s}c` as const,
		s => `${s}d` as const,
		s => `${s}e` as const
	)
}).types([3993, "instantiations"])

bench("pipe-chained(5)", () => {
	type
		.unit("a")
		.pipe(s => `${s}b` as const)
		.pipe(s => `${s}c` as const)
		.pipe(s => `${s}d` as const)
		.pipe(s => `${s}e` as const)
}).types([1714, "instantiations"])

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
}).types([5948, "instantiations"])

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
}).types([4789, "instantiations"])
