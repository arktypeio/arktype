type merge<base, props> = Omit<base, keyof props & keyof base> & props

type Type<t> = {
	merge: <r>(r: r) => Type<merge<t, r>>
}

declare const a: Type<{ a: 1 }>

const b = a.merge({ b: 2 })
const c = b.merge({ c: 3 })
const d = c.merge({ d: 4 })
const e = d.merge({ e: 5 })
const f = e.merge({ f: 6 })
const g = f.merge({ g: 7 })
const h = g.merge({ h: 8 })
const i = h.merge({ i: 9 })
const j = i.merge({ j: 10 })
const k = j.merge({ k: 11 })
const l = k.merge({ l: 12 })
const m = l.merge({ m: 13 })
const n = m.merge({ n: 14 })
