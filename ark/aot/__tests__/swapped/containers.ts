import { Hkt, scope, type, type Scope } from "arktype"

const isShort = (s: string) => s.length < 3
const isLong = (s: string) => s.length > 3
const ShortString = type("string").narrow(isShort)
const isA = (s: string) => s === "a"
const isB = (s: string) => s === "b"

type Box<t> = { v: t }

// each pair differs only in what decides its Types, which factories tell apart
export const undefinedOptional = scope(
	{ s: "string" },
	{ exactOptionalPropertyTypes: false }
)
export const exactOptional = scope(
	{ s: "string" },
	{ exactOptionalPropertyTypes: true }
)
export const thunkedString = scope({ c: () => type("string") })
export const thunkedNumber = scope({ c: () => type("number") })
export const repeatsShort = scope({
	a: ["string", ":", isShort],
	b: ["string", ":", isLong],
	c: ["string", ":", isShort]
})
export const repeatsLong = scope({
	a: ["string", ":", isShort],
	b: ["string", ":", isLong],
	c: ["string", ":", isLong]
})
// arktype tests a narrow on a union of units as it resolves the alias, keeping the units it accepts
export const keepsA = scope({ c: ["'a' | 'b'", ":", isA] })
export const keepsB = scope({ c: ["'a' | 'b'", ":", isB] })
export const holdsShort = scope({ a: ShortString, c: ["string", ":", isShort] })
export const holdsLong = scope({ a: ShortString, c: ["string", ":", isLong] })

// each pair differs only in what its thunks return, so each is annotated
export const thunksReturningX: Scope<any> = scope({
	f: "string",
	t: () => thunksReturningX.type("f | number"),
	k: () => thunksReturningX.type({ x: "f" }),
	G: () => type.generic("t")({ v: "t" })
})
export const thunksReturningY: Scope<any> = scope({
	f: "string",
	t: () => thunksReturningY.type("f | boolean"),
	k: () => thunksReturningY.type({ y: "f" }),
	G: () => type.generic("t")({ w: "t" })
})

export const ArrayOf = type.generic("t")(
	args => args.t.array(),
	class extends Hkt<[unknown]> {
		declare body: this[0][]
	}
)
export const BoxOf = type.generic("t")(
	args => type({ v: args.t }),
	class extends Hkt<[unknown]> {
		declare body: Box<this[0]>
	}
)

const boxes = scope({ "Box<t>": { v: "t" }, foo: "string" })
// each pair differs only in the Scope a Generic bound into it parses its arguments in
export const NumberFooBox = scope({
	...boxes.export("Box"),
	foo: "number"
}).export().Box
export const BooleanFooBox = scope({
	...boxes.export("Box"),
	foo: "boolean"
}).export().Box

export const shortNames = scope({ name: ["string", ":", isShort] }).export()
export const longNames = scope({ name: ["string", ":", isLong] }).export()

// each pair differs only in where a nested definition ends
export const separateNesting = scope({
	f: ["string", ":", isShort],
	o: { a: { b: "f" }, c: "number" }
})
export const sharedNesting = scope({
	f: ["string", ":", isShort],
	o: { a: { b: "f", c: "number" } }
})
export const nestedTuple = scope({
	f: ["string", ":", isShort],
	o: [["f", "number"]]
})
export const flatTuple = scope({
	f: ["string", ":", isShort],
	o: ["f", "number"]
})
export const separateModule = type.module({
	a: type.module({ b: ShortString }),
	c: type("number")
})
export const sharedModule = type.module({
	a: type.module({ b: ShortString, c: type("number") })
})

// each pair differs only in the Scope its Types' methods parse arguments in
const stringF = scope({ f: "string" })
const numberF = scope({ f: "number" })
export const BigintOfStringF = stringF.type("bigint")
export const BigintOfNumberF = numberF.type("bigint")
export const stringIds = scope({
	id: "string",
	user: { name: "string" }
}).export()
export const numberIds = scope({
	id: "number",
	user: { name: "string" }
}).export()

export const lengthOf = type.fn("string")(s => s.length)
export const doubled = type.fn("number")(n => n * 2)
