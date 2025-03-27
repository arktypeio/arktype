import { bench } from "@ark/attest"
import { type } from "arktype"

export type merge<base, props> = Omit<base, keyof props & keyof base> & props

declare const merge: <l, r>(l: l, r: r) => merge<l, r>

bench("with caching", () => {
	const a = merge({ a: 1 }, { b: 2 })
	const b = merge(a, { c: 3 })
	const c = merge(b, { d: 4 })
	const d = merge(c, { e: 5 })
	const e = merge(d, { f: 6 })
	const f = merge(e, { g: 7 })
	const g = merge(f, { h: 8 })
	const h = merge(g, { i: 9 })
	const i = merge(h, { j: 10 })
	const j = merge(i, { k: 11 })
	const k = merge(j, { l: 12 })
	const l = merge(k, { m: 13 })
	const m = merge(l, { n: 14 })
	const n = merge(m, { o: 15 })
	const o = merge(n, { p: 16 })
}).types([733, "instantiations"])

bench("actual", () => {
	const a = merge({ a: 1 }, { b: 2 })
	const b = merge(a, { c: 3 })
	const c = merge(b, { d: 4 })
	const d = merge(c, { e: 5 })
	const e = merge(d, { f: 6 })
	const f = merge(e, { g: 7 })
	const g = merge(f, { h: 8 })
	const h = merge(g, { i: 9 })
	const i = merge(h, { j: 10 })
	const j = merge(i, { k: 11 })
	const k = merge(j, { l: 12 })
	const l = merge(k, { m: 13 })
	const m = merge(l, { n: 14 })
	const n = merge(m, { o: 15 })
	// Error: Type instantiation is excessively deep and possibly infinite
	const o = merge(n, { p: 16 })
}).types([24349567, "instantiations"])
