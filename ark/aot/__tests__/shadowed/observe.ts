import { type } from "arktype"
import { assertOf, jsonOf, listOf, metaOf, standardOf } from "listing"
import { $, Email, morphs, Name, Person, Trimmed, types } from "./types.ts"

const fields = { name: Name, email: Email }

const Contact = type(fields)

const Ids = $.type("Id[]")

const tagged = (tag: string) => {
	const Tagged = type({ tag: "string" }).narrow(d => d.tag === tag)
	return Tagged
}

class Point {
	#x = 1
	get x() {
		return this.#x
	}
}

const Located = type({ x: "number" })

const ParsedPerson = type("string.json.parse").to(Person)

const PipedPerson = type("string.json.parse").pipe(Person)

const Revived = type("string")
	.pipe(s => JSON.parse(s))
	.to(Person)

const DescribedPerson = Person.describe("a person")

const uuid = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/

// each call answers otherwise, so its validator's must be answered from arktype's
const Stamped = type({
	id: ["string", "=", () => crypto.randomUUID()],
	name: type("string").pipe(s => `${s} ${crypto.randomUUID()}`)
})

let narrowed = 0

const Counted = type("string").narrow(() => ++narrowed > 0)

// each writes its argument, so its validator's must be written as arktype's left it
const Incremented = type({ n: "number" }).pipe(
	o => {
		o.n++
		return o
	},
	o => Object.assign(o, { id: crypto.randomUUID() })
)

const Nested = type({
	user: type({ name: "string" }).pipe((u, ctx) => {
		u.name = `${u.name.trim()} at ${ctx.propString}`
		return u
	})
})

const Detached = type({ name: "string", tags: "string[]" }).pipe(o => {
	const { tags } = o
	delete (o as Partial<typeof o>).tags
	tags.sort()
	return { ...o, tags }
})

const Short = type("string").narrow(
	(s, ctx) => s.length < 3 || ctx.mustBe("short")
)

// its parameters are validated as an array arktype creates, the root of its own traversal
const named = type.fn({ name: Short }, ":", "string")(u => u.name)

const isShort = (s: string) => s.length < 3

// a callback the site reads twice, which arktype receives through one parameter
const Shorts = type({
	a: type("string").narrow(isShort),
	b: type("string").narrow(isShort)
})

let listed = 0

// each writes its argument unlike Incremented, which its validator must match
const Listed = type({ tags: "string[]" }).pipe(o =>
	Object.assign(o, { tags: new Set(o.tags), listed: ++listed })
)

const Dated = type({ at: "Date" }).pipe(o => (o.at.setTime(0), o))

const Named = type({ name: "string", tags: "string[]" }).pipe(o => {
	o.name = o.name.trim()
	return o
})

const Positive = type("number").narrow(
	(n, ctx) => n > 0 || ctx.reject({ expected: "positive" })
)

const HasPerson = type({ person: "unknown" }).narrow(o =>
	Person.allows(o.person)
)

const Long = type("string > 3").configure({ expected: "long" })

class Counter {
	count = 1
}

// a copy would lose the class, so its validator receives the instance arktype's morph wrote
const Bumped = type({ count: "number" }).pipe(counter => ++counter.count)

const outcomeOf = (run: () => unknown) => {
	try {
		return run()
	} catch (e) {
		return String(e)
	}
}

// what main.ts prints and shadow.spec.ts compares, once per process
export const observe = async (): Promise<Record<string, unknown>> => {
	const point = new Point()
	const incremented = { n: 1 }
	const stamped = Stamped({ name: "a" }) as { id: string; name: string }
	return {
		trimmed: Trimmed("  a "),
		standard: outcomeOf(() => standardOf(Trimmed, 1)),
		morphs: morphs.size,
		contact: Contact({ name: "", email: "a@b.c" }).toString(),
		ids: Ids(["x"]).toString(),
		user: types.User({ id: "x", name: "n" }).toString(),
		tagged: [
			tagged("a").allows({ tag: "a" }),
			tagged("b").allows({ tag: "a" })
		],
		located: Located(point) === point,
		errors: Name("") instanceof type.errors,
		parseError: outcomeOf(() => type("strin" as never)),
		created: await import("./created.ts").then(() => "created", String),
		introspected: [Person.json, Person.toJsonSchema()],
		composed: [
			ParsedPerson('{"name":"a"}'),
			PipedPerson('{"name":1}').toString(),
			Revived('{"name":1}').toString(),
			Revived.expression
		],
		described: [DescribedPerson.description, Person.expression],
		listed: outcomeOf(() => String(listOf(Person))),
		unbaked: outcomeOf(() => JSON.stringify(jsonOf(Person))),
		keywordMeta: outcomeOf(() => metaOf(Email)),
		stamped: [uuid.test(stamped.id), uuid.test(stamped.name.slice(2))],
		narrowed: [Counted("a"), narrowed],
		incremented: [
			Incremented(incremented) === incremented,
			incremented.n,
			uuid.test((incremented as { id?: string }).id!)
		],
		written: [
			[...(Listed({ tags: ["a", "b"] }) as { tags: Set<string> }).tags],
			listed,
			Dated({ at: new Date(1) }),
			Named({ name: " a ", tags: Object.freeze(["x"]) }),
			Nested({ user: { name: " a " } }),
			Detached({ name: "a", tags: ["b", "a"] })
		],
		shorts: Shorts({ a: "x", b: "yyy" }).toString(),
		// failing twice, where a first-issue validator stops at a
		shortsTwice: Shorts({ a: "xxx", b: "yyy" }).toString(),
		named: [named({ name: "ab" }), outcomeOf(() => named({ name: "abc" }))],
		positive: Positive(-1).toString(),
		nested: [
			HasPerson.allows({ person: { name: "a" } }),
			HasPerson.allows({ person: {} })
		],
		long: Long("ab").toString(),
		asserted: outcomeOf(() => assertOf(Long, "ab")),
		uncopied: Bumped(new Counter())
	}
}
