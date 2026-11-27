import { attest, contextualize } from "@ark/attest"
import type { StandardSchemaV1 } from "@ark/schema"
import {
	byPath,
	flatMessagesByPath,
	fromJsonSchema,
	lineOf,
	scope,
	type
} from "arktype"
import { lineOf as runtimeLineOf } from "arktype/runtime"
import "arktype/i18n"
import { codec } from "arktype/codecs"
import { de } from "arktype/locales/de"

const UnitPrice = type("number > 0").label("Unit price")

const LineItem = type({ unitPriceCents: UnitPrice })

// each issue's path, propString and message, then the summary
const reportOf = (T: type.Any, data: unknown) => {
	const out = T(data) as type.errors
	return [out.issues.map(e => [e.path, e.propString, e.message]), out.summary]
}

contextualize(() => {
	describe("message", () => {
		it("names a failing constraint's value by its label", () => {
			attest(reportOf(LineItem, { unitPriceCents: 0 })).snap([
				[[["unitPriceCents"], "unitPriceCents", "Unit price must be positive"]],
				"Unit price must be positive"
			])
		})

		it("names a value of the wrong type by its label", () => {
			attest(reportOf(LineItem, { unitPriceCents: "1" })).snap([
				[[["unitPriceCents"], "unitPriceCents", "Unit price must be a number"]],
				"Unit price must be a number"
			])
		})

		it("names a missing key's value by its label", () => {
			attest(reportOf(LineItem, {})).snap([
				[
					[
						["unitPriceCents"],
						"unitPriceCents",
						"Unit price must be a number (was missing)"
					]
				],
				"Unit price must be a number (was missing)"
			])
		})

		it("names a root value by its label", () => {
			attest(reportOf(UnitPrice, 0)).snap([
				[[[], "", "Unit price must be positive"]],
				"Unit price must be positive"
			])
		})

		it("is set by a tuple expression's meta", () => {
			const T = type({
				unitPriceCents: ["number > 0", "@", { label: "Unit price" }]
			})
			attest(reportOf(T, { unitPriceCents: 0 })).equals(
				reportOf(LineItem, { unitPriceCents: 0 })
			)
		})

		it("names a description as what's expected", () => {
			const T = type({
				price: type("number > 0").describe("a price").label("Price")
			})
			attest((T({ price: 0 }) as type.errors).summary).snap(
				"Price must be a price"
			)
		})

		it("is a Standard Schema issue's message, at the key's path", () => {
			const result = LineItem["~standard"].validate({
				unitPriceCents: 0
			}) as StandardSchemaV1.FailureResult
			attest(result.issues.map(issue => [issue.message, issue.path])).snap([
				["Unit price must be positive", ["unitPriceCents"]]
			])
		})

		it("leaves byPath and flatMessagesByPath keyed by path", () => {
			const out = LineItem({ unitPriceCents: 0 }) as type.errors
			attest(Object.keys(byPath(out))).equals(["unitPriceCents"])
			attest(flatMessagesByPath(out)).snap({
				unitPriceCents: ["Unit price must be positive"]
			})
		})

		it("is shallow by default, naming no value below the one labeled", () => {
			const Item = type({ price: "number > 0" }).label("Item")
			attest((Item({ price: 0 }) as type.errors).summary).snap(
				"price must be positive"
			)
			attest((Item(null) as type.errors).summary).snap("Item must be an object")
		})

		it("stays readable as meta for a custom writer", () => {
			const out = LineItem({}) as type.errors
			const [error] = out.issues
			attest(error.code === "required" && error.valueMeta.label).equals(
				"Unit price"
			)
			const [range] = (LineItem({ unitPriceCents: 0 }) as type.errors).issues
			attest(range.meta?.label).equals("Unit price")
		})
	})

	describe("a narrow", () => {
		const inRange = (s: string) => +s >= 0 && +s <= 100

		it("names its value in what ctx.mustBe says it must be", () => {
			const T = type({
				pct: type("string")
					.narrow((s, ctx) => inRange(s) || ctx.mustBe("between 0 and 100"))
					.label("Pct")
			})
			attest(reportOf(T, { pct: "200" })).snap([
				[[["pct"], "pct", "Pct must be between 0 and 100"]],
				"Pct must be between 0 and 100"
			])
		})

		it("names its value in what ctx.reject's expected says it must be", () => {
			const T = type("string")
				.narrow(
					(s, ctx) =>
						inRange(s) || ctx.reject({ expected: "between 0 and 100" })
				)
				.label("Pct")
			attest(reportOf(T, "200")).snap([
				[[[], "", "Pct must be between 0 and 100"]],
				"Pct must be between 0 and 100"
			])
		})

		it("names no value at another path it rejects", () => {
			const T = type({ a: "string" })
				.narrow(
					(o, ctx) =>
						inRange(o.a) ||
						ctx.reject({ expected: "between 0 and 100", relativePath: ["a"] })
				)
				.label("Pct")
			attest((T({ a: "200" }) as type.errors).summary).snap(
				"a must be between 0 and 100"
			)
		})

		it("names its value after a morphing object (delete or default)", () => {
			const DeleteRange = type({
				"+": "delete",
				start: "string",
				end: "string"
			})
				.narrow((r, ctx) => r.end >= r.start || ctx.mustBe("valid range"))
				.label("Date range")
			attest(reportOf(DeleteRange, { start: "2", end: "1" })).snap([
				[[[], "", "Date range must be valid range"]],
				"Date range must be valid range"
			])
			attest(
				(DeleteRange({ start: "2", end: "1", extra: true }) as type.errors)
					.summary
			).snap("Date range must be valid range")
			attest((DeleteRange(null) as type.errors).summary).snap(
				"Date range must be an object"
			)
			attest((DeleteRange({ start: 1, end: "2" }) as type.errors).summary).snap(
				"start must be a string"
			)
			const deleteStandard = DeleteRange["~standard"].validate({
				start: "2",
				end: "1"
			}) as StandardSchemaV1.FailureResult
			attest(deleteStandard.issues.map(i => [i.message, i.path])).snap([
				["Date range must be valid range", []]
			])

			const DefaultedCfg = type({ a: "string = 'x'" })
				.narrow((r, ctx) => r.a.length > 1 || ctx.mustBe("long enough"))
				.label("Config")
			attest(reportOf(DefaultedCfg, {})).snap([
				[[[], "", "Config must be long enough"]],
				"Config must be long enough"
			])
			attest((DefaultedCfg(null) as type.errors).summary).snap(
				"Config must be an object"
			)
			attest((DefaultedCfg({ a: 1 }) as type.errors).summary).snap(
				"a must be a string"
			)

			const Relative = type({ "+": "delete", start: "string", end: "string" })
				.narrow(
					(r, ctx) =>
						r.end >= r.start ||
						ctx.reject({ expected: "valid range", relativePath: ["start"] })
				)
				.label("Date range")
			attest((Relative({ start: "2", end: "1" }) as type.errors).summary).snap(
				"start must be valid range"
			)

			const Custom = type({ "+": "delete", start: "string", end: "string" })
				.narrow(
					(r, ctx) =>
						r.end >= r.start || ctx.reject({ message: "Custom sentence" })
				)
				.label("Date range")
			attest((Custom({ start: "2", end: "1" }) as type.errors).summary).snap(
				"Custom sentence"
			)

			// a label called before .narrow() does not reach the narrow added after
			const Before = type({ "+": "delete", start: "string", end: "string" })
				.label("Before")
				.narrow((r, ctx) => r.end >= r.start || ctx.mustBe("valid range"))
			attest((Before(null) as type.errors).summary).snap(
				"Before must be an object"
			)
			attest((Before({ start: "2", end: "1" }) as type.errors).summary).snap(
				"must be valid range"
			)
		})
	})

	describe("a morph", () => {
		it("names its value in output checks of a piped Type", () => {
			const Form = type({
				name: type("string.trim").to("string > 0").label("Full name"),
				port: type("string.integer.parse")
					.to("1 <= number <= 65535")
					.label("Port")
			})
			const out = Form({ name: "   ", port: "99999" }) as type.errors
			attest(reportOf(Form, { name: "   ", port: "99999" })).snap([
				[
					[["name"], "name", "Full name must be non-empty"],
					[["port"], "port", "Port must be at most 65535"]
				],
				`Full name must be non-empty
Port must be at most 65535`
			])
			attest(out.issues.map(lineOf)).snap([
				"Full name must be non-empty",
				"Port must be at most 65535"
			])
			attest(lineOf).equals(runtimeLineOf)
			attest(
				out.issues.map(i => runtimeLineOf(JSON.parse(JSON.stringify(i))))
			).equals(out.issues.map(lineOf))
			const standard = Form["~standard"].validate({
				name: "   ",
				port: "99999"
			}) as StandardSchemaV1.FailureResult
			attest(standard.issues.map(i => [i.message, i.path])).snap([
				["Full name must be non-empty", ["name"]],
				["Port must be at most 65535", ["port"]]
			])
			attest((Form({ name: 1, port: "abc" }) as type.errors).summary).snap(
				`Full name must be a string
Port must be a well-formed integer string`
			)
			attest((Form({}) as type.errors).summary).snap(
				`Full name must be a string (was missing)
Port must be a string (was missing)`
			)
		})

		it("is shallow on piped object outputs and keeps prior labels scoped", () => {
			const Payload = type("string.json.parse")
				.to({ name: "string" })
				.label("Payload")
			attest((Payload("{}") as type.errors).summary).snap(
				"name must be a string (was missing)"
			)
			attest((Payload("123") as type.errors).summary).snap(
				"Payload must be an object"
			)
			attest((Payload("bad") as type.errors).summary).snap(
				"Payload must be a JSON string"
			)

			// a label called before .to() does not reach checks added after
			const Before = type("string.trim").label("Before").to("string > 0")
			attest((Before(1) as type.errors).summary).snap("Before must be a string")
			attest((Before("   ") as type.errors).summary).snap("must be non-empty")

			// outer .label() overrides inner .label(), matching non-morph precedence
			const Override = type("string.trim")
				.to(type("string > 0").label("Inner"))
				.label("Outer")
			const NonMorphOverride = type("string > 0").label("Inner").label("Outer")
			attest((Override("   ") as type.errors).summary).equals(
				(NonMorphOverride("") as type.errors).summary
			)
			attest((Override("   ") as type.errors).summary).snap(
				"Outer must be non-empty"
			)

			// an explicit message on the output stays as written
			const WithMessage = type("string.trim")
				.to(type("string").atLeastLength(1, "Enter a name"))
				.label("Full name")
			attest((WithMessage("   ") as type.errors).summary).snap("Enter a name")
			attest((WithMessage(1) as type.errors).summary).snap(
				"Full name must be a string"
			)

			// a labeled morph does not leak its label into another Type piped with ctx
			const Inner = type("string").narrow(
				(s, ctx) => s.length > 0 || ctx.mustBe("non-empty")
			)
			const PipedInner = type("string")
				.pipe((s, ctx) => Inner.internal(s.trim(), ctx))
				.label("Outer")
			attest((PipedInner("   ") as type.errors).summary).snap(
				"must be non-empty"
			)

			// restoring ctx.lbl in finally prevents a caught throwing morph from corrupting outer labels
			const ThrowingLabeled = type("string")
				.pipe((_s, _ctx) => {
					throw new Error("boom")
				})
				.label("Inner")
			const CatchInner = type("string").pipe((s, ctx) => {
				try {
					return ThrowingLabeled.internal(s, ctx)
				} catch {
					return ctx.error("fallback")
				}
			})
			attest((CatchInner("x") as type.errors).summary).snap("must be fallback")

			const ThrowingUnlabeled = type("string").pipe((_s, _ctx) => {
				throw new Error("boom")
			})
			const CatchOuter = type("string")
				.pipe((s, ctx) => {
					try {
						return ThrowingUnlabeled.internal(s, ctx)
					} catch {
						return ctx.error("fallback")
					}
				})
				.label("Outer")
			attest((CatchOuter("x") as type.errors).summary).snap(
				"Outer must be fallback"
			)
		})

		it("works identically in jitless mode and other locales", () => {
			const $ = scope({}, { jitless: true })
			const DeleteRange = $.type({
				"+": "delete",
				start: "string",
				end: "string"
			})
				.narrow((r, ctx) => r.end >= r.start || ctx.mustBe("valid range"))
				.label("Date range")
			const Form = $.type({
				name: $.type("string.trim").to("string > 0").label("Full name"),
				port: $.type("string.integer.parse")
					.to("1 <= number <= 65535")
					.label("Port")
			})
			const rangeErr = DeleteRange({ start: "2", end: "1" }) as type.errors
			attest(rangeErr.summary).snap("Date range must be valid range")
			attest(rangeErr.summaryIn(de)).snap(
				"Date range muss ein Wert gemäß der Beschreibung „valid range“ sein"
			)
			const formErr = Form({ name: "   ", port: "99999" }) as type.errors
			attest(formErr.summary).snap(`Full name must be non-empty
Port must be at most 65535`)
			attest(formErr.summaryIn(de)).snap(`Full name darf nicht leer sein
Port muss höchstens 65535 sein`)
		})

		it("preserves labels across .encode in JIT and jitless", () => {
			const PortObj = type({
				port: type("string.integer.parse").label("Port")
			})
			// call twice to exercise both uncompiled and JIT-compiled paths
			for (let i = 0; i < 2; i++) {
				const bad = PortObj.encode({ port: "bad" }) as type.errors
				attest(bad.summary).snap("Port must be a number")
				attest((PortObj.encode({ port: 1.5 }) as type.errors).summary).snap(
					"Port must be an integer"
				)
				attest((PortObj.encode({}) as type.errors).summary).snap(
					"Port must be a number (was missing)"
				)
			}
			// round-tripped encoder keeps the label too
			attest(
				(PortObj.encode.encode({ port: "abc" }) as type.errors).summary
			).snap("Port must be a well-formed integer string")

			// decode-only description is not copied onto encode's input domain
			const Described = type({
				port: type("string.integer.parse")
					.describe("an integer string")
					.label("Port")
			})
			attest((Described.encode({ port: "bad" }) as type.errors).summary).snap(
				"Port must be a number"
			)

			// piped codecs preserve label on both input constraints and output format checks
			const Form = type({
				name: type("string.trim").to("string > 0").label("Full name"),
				port: type("string.integer.parse")
					.to("1 <= number <= 65535")
					.label("Port")
			})
			attest((Form.encode({ name: "   ", port: 99999 }) as type.errors).summary)
				.snap(`Full name must be trimmed
Port must be at most 65535`)
			attest((Form.encode({ name: "", port: 1.5 }) as type.errors).summary)
				.snap(`Full name must be non-empty
Port must be an integer`)

			// custom codec encode ctx.error uses the label
			const Natural = codec("string.integer", "bigint", {
				decode: s => BigInt(s),
				encode: (n, ctx) => (n < 0n ? ctx.error("non-negative") : `${n}`)
			}).label("Natural")
			const NaturalObj = type({ n: Natural })
			attest((NaturalObj.encode({ n: -1n }) as type.errors).summary).snap(
				"Natural must be non-negative"
			)
			attest((NaturalObj.encode({ n: "bad" }) as type.errors).summary).snap(
				"Natural must be a bigint"
			)

			// shallow on piped object output and preserves label on circular stringify error
			const Payload = type("string.json.parse")
				.to({ name: "string" })
				.label("Payload")
			attest((Payload.encode(123) as type.errors).summary).snap(
				"Payload must be an object"
			)
			attest((Payload.encode({}) as type.errors).summary).snap(
				"name must be a string (was missing)"
			)
			const circ: Record<string, unknown> = { name: "x" }
			circ.self = circ
			attest((Payload.encode(circ) as type.errors).summary).snap(
				"Payload must be a JSON-serializable value"
			)

			// jitless mode
			const $ = scope({}, { jitless: true })
			const JitlessPort = $.type({
				port: $.type("string.integer.parse").label("Port")
			})
			const jitlessErr = JitlessPort.encode({ port: "bad" }) as type.errors
			attest(jitlessErr.summary).snap("Port must be a number")
		})

		it("preserves labels across .encode in German locale", () => {
			const PortObj = type({
				port: type("string.integer.parse").label("Port")
			})
			const $ = scope({}, { jitless: true })
			const JitlessPort = $.type({
				port: $.type("string.integer.parse").label("Port")
			})
			// call twice to exercise both uncompiled and JIT-compiled paths
			const bad0 = PortObj.encode({ port: "bad" }) as type.errors
			const bad1 = PortObj.encode({ port: "bad" }) as type.errors
			const jitlessErr = JitlessPort.encode({ port: "bad" }) as type.errors
			attest(bad0.summaryIn(de)).snap("Port muss eine Zahl sein")
			attest(bad1.summaryIn(de)).snap("Port muss eine Zahl sein")
			attest(jitlessErr.summaryIn(de)).snap("Port muss eine Zahl sein")
		})
	})

	describe("an explicit message", () => {
		it("from .message() is said as written", () => {
			const T = type({
				price: type("number > 0").label("Price").message("Enter a price")
			})
			attest(reportOf(T, { price: 0 })).snap([
				[[["price"], "price", "Enter a price"]],
				"price: Enter a price"
			])
			attest((T({}) as type.errors).summary).snap("price: Enter a price")
		})

		it("from a constraint method is said as written", () => {
			const T = type({
				price: type("number").moreThan(0, "Enter a price").label("Price")
			})
			attest(reportOf(T, { price: 0 })).snap([
				[[["price"], "price", "Enter a price"]],
				"price: Enter a price"
			])
			// a check without one is still labeled
			attest((T({ price: "1" }) as type.errors).summary).snap(
				"Price must be a number"
			)
		})

		it("a narrow rejects with is said as written", () => {
			const T = type("string")
				.narrow((s, ctx) => s.length < 3 || ctx.reject({ message: "Too long" }))
				.label("Pct")
			attest((T("abcd") as type.errors).summary).snap("Too long")
		})

		it("configured for its code is said as written", () => {
			const $ = scope({}, { min: { message: "Too small" } })
			const T = $.type({ price: $.type("number > 0").label("Price") })
			attest(reportOf(T, { price: 0 })).snap([
				[[["price"], "price", "Too small"]],
				"price: Too small"
			])
		})
	})

	describe("summary", () => {
		it("keeps the path before the key a label names", () => {
			const Order = type({ billing: LineItem })
			attest(
				(Order({ billing: { unitPriceCents: 0 } }) as type.errors).summary
			).snap("billing: Unit price must be positive")
		})

		it("keeps an index before the key a label names", () => {
			const Order = type({ items: LineItem.array() })
			attest(reportOf(Order, { items: [{ unitPriceCents: 0 }] })).snap([
				[
					[
						["items", 0, "unitPriceCents"],
						"items[0].unitPriceCents",
						"Unit price must be positive"
					]
				],
				"items[0]: Unit price must be positive"
			])
		})

		it("keeps an index a label names", () => {
			const Prices = type({ prices: type("number > 0").label("Price").array() })
			attest((Prices({ prices: [1, 0] }) as type.errors).summary).snap(
				"prices[1]: Price must be positive"
			)
		})

		it("writes a line for each error, labeled or not", () => {
			const T = type({ unitPriceCents: UnitPrice, quantity: "number.integer" })
			attest((T({ unitPriceCents: 0, quantity: 1.5 }) as type.errors).summary)
				.snap(`Unit price must be positive
quantity must be an integer`)
		})
	})

	describe("union", () => {
		it("names its value by its own label", () => {
			const T = type({ id: type("string | number").label("ID") })
			attest(reportOf(T, { id: true })).snap([
				[[["id"], "id", "ID must be a number or a string"]],
				"ID must be a number or a string"
			])
		})

		it("names its value by a label each failing branch shares", () => {
			const T = type({
				contact: type("string.email")
					.label("Contact")
					.or(type("string.url").label("Contact"))
			})
			attest((T({ contact: "x" }) as type.errors).summary).snap(
				"Contact must be an email address or a URL string"
			)
		})

		it("names a value each branch labels alike, told apart by its type", () => {
			const T = type({
				id: type("string").label("ID").or(type("number").label("ID"))
			})
			attest((T({ id: true }) as type.errors).summary).snap(
				"ID must be a number or a string"
			)
		})

		it("names a missing value each branch labels alike", () => {
			const T = type({
				id: type("string").label("ID").or(type("number").label("ID"))
			})
			attest(reportOf(T, {})).snap([
				[[["id"], "id", "ID must be a number or a string (was missing)"]],
				"ID must be a number or a string (was missing)"
			])
		})

		it("names no value branches label differently", () => {
			const T = type({
				id: type("string").label("Name").or(type("number").label("Count"))
			})
			attest((T({ id: true }) as type.errors).summary).snap(
				"id must be a number or a string"
			)
			attest((T({}) as type.errors).summary).snap(
				"id must be a number or a string (was missing)"
			)
		})

		it("lists each labeled branch's error by its label", () => {
			const T = type({ email: type("string").label("Email") }).or({
				phone: "number"
			})
			attest(reportOf(T, { email: 1, phone: "1" })).snap([
				[[[], "", "Email must be a string or phone must be a number"]],
				"Email must be a string or phone must be a number"
			])
		})

		it("lists a labeled error below its path after the path before its key", () => {
			const T = type({
				contact: type({ email: type("string").label("Email") }).or({
					phone: "number"
				})
			})
			attest(reportOf(T, { contact: { email: 1, phone: "1" } })).snap([
				[
					[
						["contact"],
						"contact",
						"Email must be a string or phone must be a number"
					]
				],
				"contact: Email must be a string or contact.phone must be a number"
			])
		})
	})

	describe("JSON Schema", () => {
		it("writes a label as title", () => {
			attest(UnitPrice.toJsonSchema()).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "number",
				title: "Unit price",
				exclusiveMinimum: 0
			})
		})

		it("writes title over a label", () => {
			const T = type("string").configure({ title: "Name", label: "Full name" })
			attest(T.toJsonSchema()).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "string",
				title: "Name"
			})
		})

		it("reads title as title, not a label", () => {
			const T = fromJsonSchema({ type: "string", title: "Name" })
			attest(T.meta).snap({ title: "Name" })
			attest((T(1) as type.errors).summary).snap("must be a string")
		})
	})
})
