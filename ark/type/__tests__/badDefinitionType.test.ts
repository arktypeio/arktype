import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"
import { writeBadDefinitionTypeMessage } from "arktype/internal/parser/definition.ts"

contextualize(() => {
	it("undefined", () => {
		// @ts-expect-error
		attest(() => type({ bad: undefined })).throwsAndHasTypeError(
			writeBadDefinitionTypeMessage("undefined")
		)
	})

	it("null", () => {
		// @ts-expect-error
		attest(() => type({ bad: null })).throwsAndHasTypeError(
			writeBadDefinitionTypeMessage("null")
		)
	})

	it("boolean", () => {
		// @ts-expect-error
		attest(() => type({ bad: true })).throwsAndHasTypeError(
			writeBadDefinitionTypeMessage("boolean")
		)
	})

	it("number", () => {
		// @ts-expect-error
		attest(() => type({ bad: 5 })).throwsAndHasTypeError(
			writeBadDefinitionTypeMessage("number")
		)
	})

	it("bigint", () => {
		// @ts-expect-error
		attest(() => type({ bad: 99999n })).throwsAndHasTypeError(
			writeBadDefinitionTypeMessage("bigint")
		)
	})

	it("symbol", () => {
		// @ts-expect-error
		attest(() => type({ bad: Symbol() })).throwsAndHasTypeError(
			writeBadDefinitionTypeMessage("symbol")
		)
	})

	it("a class, by what to write instead", () => {
		// @ts-expect-error
		attest(() => type({ createdAt: Date }))
			.throws.snap(
				"ParseError: Type definitions must be strings or objects (was Function). Write a class as type.instanceOf(MyClass) or a keyword like Date, and a predicate as .narrow(fn)"
			)
			.type.errors.snap(
				"Type 'DateConstructor' is not assignable to type '\"Type definitions must be strings or objects (was Function). Write a class as type.instanceOf(MyClass) or a keyword like Date, and a predicate as .narrow(fn)​\"'."
			)
		// one that can't be called, at the root
		class User {}
		// @ts-expect-error
		attest(() => type(User)).throwsAndHasTypeError(
			writeBadDefinitionTypeMessage("Function")
		)
	})

	it("a constructor only new can call, by what to write instead", () => {
		// @ts-expect-error
		attest(() => type(Map)).throwsAndHasTypeError(
			writeBadDefinitionTypeMessage("Function")
		)
		// @ts-expect-error
		attest(() => type({ seen: Set })).throwsAndHasTypeError(
			writeBadDefinitionTypeMessage("Function")
		)
		// @ts-expect-error
		attest(() => type(WeakMap)).throwsAndHasTypeError(
			writeBadDefinitionTypeMessage("Function")
		)
	})

	it("a bound thunk, whose source is the engine's, is still called", () => {
		const thunk = (() => type("string")).bind(null)
		attest(type(thunk).expression).snap("string")
	})

	it("a predicate throws what to write instead, though its type isn't read", () => {
		attest(() => type({ name: (s: string) => s.length > 0 })).throws.snap(
			"ParseError: Type definitions must be strings or objects (was Function). Write a class as type.instanceOf(MyClass) or a keyword like Date, and a predicate as .narrow(fn)"
		)
	})

	it("a literal value, by what to write instead", () => {
		// @ts-expect-error
		attest(() => type({ count: 5 }))
			.throws.snap(
				"ParseError: Type definitions must be strings or objects (was number). Write a literal value in a string, or pass it to type.unit()"
			)
			.type.errors.snap(
				"Type 'number' is not assignable to type '\"Type definitions must be strings or objects (was number). Write a literal value in a string, or pass it to type.unit()​\"'."
			)
	})

	it("any", () => {
		// doesn't error, so this test is just to ensure it doesn't infinitely recurse
		const T = type({ bad: {} as any })
		attest<{ bad: any }>(T.infer)
	})

	it("never", () => {
		// can't error
		const T = type({ bad: {} as never })
		attest<{ bad: never }>(T.infer)
	})

	it("unknown", () => {
		// @ts-expect-error just results in base completions, so we just check there's an error
		attest(() => type({ bad: {} as unknown })).type.errors("")
	})
})
