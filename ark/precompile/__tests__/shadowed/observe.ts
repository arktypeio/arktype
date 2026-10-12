import { type } from "arktype"
import { Fresh } from "./diverging.ts"
import { $, Email, morphs, Name, Trimmed, types } from "./types.ts"

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

let lengthCalls = 0

// arktype and its validator each call the implementation, which answers each call otherwise
const length = type.fn("string", ":", "number")(s => s.length + lengthCalls++)

class Counter {
	count = 1
}

// a copy would lose the class, so arktype's morph writes the instance its validator then receives
const Incremented = type({ count: "number" }).pipe(counter => ++counter.count)

const outcomeOf = (run: () => unknown) => {
	try {
		return run()
	} catch (e) {
		return String(e)
	}
}

// what main.ts prints and shadow.spec.ts compares, called once in a process since its sites hold state
export const observe = async (): Promise<Record<string, unknown>> => {
	const point = new Point()
	return {
		trimmed: Trimmed("  a "),
		standard: Trimmed["~standard"].validate(1),
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
		diverged: outcomeOf(() => Fresh({})),
		length: outcomeOf(() => length("abc")),
		uncopied: outcomeOf(() => Incremented(new Counter()))
	}
}
