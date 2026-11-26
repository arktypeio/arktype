import { attest, contextualize } from "@ark/attest"
import type { StandardSchemaV1 } from "@ark/schema"
import {
	byPath,
	flatMessagesByPath,
	fromJsonSchema,
	scope,
	type
} from "arktype"

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

	describe("pipe", () => {
		it("names what a morph pipes to by the morph's label", () => {
			const T = type({
				quantity: type("string.numeric.parse")
					.to("number > 5")
					.label("Quantity")
			})
			attest(reportOf(T, { quantity: "five" })).snap([
				[
					[
						["quantity"],
						"quantity",
						"Quantity must be a well-formed numeric string"
					]
				],
				"Quantity must be a well-formed numeric string"
			])
			attest(reportOf(T, { quantity: "5" })).snap([
				[[["quantity"], "quantity", "Quantity must be more than 5"]],
				"Quantity must be more than 5"
			])
			attest(reportOf(T, {})).snap([
				[[["quantity"], "quantity", "Quantity must be a string (was missing)"]],
				"Quantity must be a string (was missing)"
			])
			// its output keeps its own meta and JSON Schema
			attest(T.get("quantity").out.meta.label).equals(undefined)
			attest(T.get("quantity").out.json).equals(type("number > 5").json)
		})

		it("names what a morph pipes to once compiled", () => {
			const Quantity = type("string.numeric.parse")
				.to("number > 5")
				.label("Quantity")
			// a Type compiles at its second call
			Quantity("6")
			attest(Quantity("6")).equals(6)
			attest(Quantity("5").toString()).snap("Quantity must be more than 5")
		})

		it("names each node of a pipeline by the label it ends with", () => {
			const Name = type("string.trim")
				.to("string > 0")
				.pipe(s => s.toUpperCase())
				.to("string < 5")
				.label("Name")
			attest(Name("  ").toString()).snap("Name must be non-empty")
			attest(Name("abcde").toString()).snap("Name must be at most length 4")
		})

		it("leaves a message the piped node says as written", () => {
			const Quantity = type("string.numeric.parse")
				.to(type("number").moreThan(5, "Order more than five"))
				.label("Quantity")
			attest(Quantity("5").toString()).snap("Order more than five")
		})

		it("names by its own label what an unlabeled morph pipes to", () => {
			const T = type({
				quantity: type("string.numeric.parse").to(
					type("number > 5").label("Quantity")
				)
			})
			attest(reportOf(T, { quantity: "five" })).snap([
				[[["quantity"], "quantity", "must be a well-formed numeric string"]],
				"quantity must be a well-formed numeric string"
			])
			attest(reportOf(T, { quantity: "5" })).snap([
				[[["quantity"], "quantity", "Quantity must be more than 5"]],
				"Quantity must be more than 5"
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
