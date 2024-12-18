import { attest, contextualize } from "@ark/attest"
import { Trait, compose, implement } from "@ark/util"
import { Rectangle, Rhombus, Square } from "./traits.scratch.ts"

export class Describable extends Trait<{
	abstractMethods: {
		writeDefaultDescription(): string
	}
}> {
	description: string

	constructor(rule: unknown, attributes?: { description?: string }) {
		super()
		this.description = attributes?.description ?? this.writeDefaultDescription()
	}
}

export class Boundable<data> extends Trait<{
	abstractMethods: { sizeOf(data: data): number }
}> {
	limit: number | undefined

	constructor(rule: { limit?: number }) {
		super()
		this.limit = rule.limit
	}

	check(data: data): boolean {
		return this.limit === undefined || this.sizeOf(data) <= this.limit
	}
}

contextualize(() => {
	it("implement", () => {
		class StringChecker extends implement(Describable, Boundable<string>, {
			writeDefaultDescription: () => "foo",
			sizeOf: (data: string) => data.length
		}) {}

		const shortString = new StringChecker(
			{ limit: 5 },
			{ description: "a short string" }
		)

		type Params = ConstructorParameters<typeof StringChecker>
		attest<
			[
				{
					limit?: number
				},
				(
					| {
							description?: string
					  }
					| undefined
				)?
			],
			Params
		>()
		attest(shortString.check("foo")).equals(true)
		attest(shortString.check("toolong")).equals(false)
		attest(shortString.description).equals("a short string")
		attest(shortString.writeDefaultDescription()).equals("foo")

		const withDefault = new StringChecker({ limit: 5 })
		attest(withDefault.description).equals("foo")
		attest([
			withDefault instanceof StringChecker,
			withDefault instanceof Boundable,
			withDefault instanceof Describable
		]).equals([true, true, true])
	})

	it("works with subclasses", () => {
		class Foo extends Boundable<number> {
			getFoo() {
				return "foo"
			}
		}
		class Bar extends implement(Foo, {
			sizeOf: (data: number) => data
		}) {}
		const b = new Bar({ limit: 2 })
		attest(b.check(1)).equals(true)
		attest(b.check(3)).equals(false)
		attest(b.getFoo()).equals("foo")
	})

	it("preserves static", () => {
		class A extends Trait {
			static readonly a = "a"

			readonly a = "a"
		}
		class B extends Trait<{
			abstractStatics: {
				foo: "Bar"
			}
		}> {
			static readonly b = "b"

			readonly b = "b"
		}

		class C extends compose(A, B) {
			static readonly c = "c"

			readonly c = "c"
		}

		attest<"a">(C.a).equals("a")
		attest<"b">(C.b).equals("b")
		attest<"c">(C.c).equals("c")
		const c = new C()
		attest<"a">(c.a).equals("a")
		attest<"b">(c.b).equals("b")
		attest<"c">(c.c).equals("c")
	})

	it("trait from trait", () => {
		class A extends Trait {
			readonly a = "a"
		}
		class B extends Trait {
			readonly b = "b"
		}
		class C extends compose(A, B) {
			readonly c = "c"
		}
		class D extends Trait {
			readonly d = "d"
		}
		class E extends compose(C, D) {
			readonly e = "e"
		}
		const e = new E()
		attest<"a">(e.a).equals("a")
		attest<"b">(e.b).equals("b")
		attest<"c">(e.c).equals("c")
		attest<"d">(e.d).equals("d")
		attest<"e">(e.e).equals("e")
		attest(e.traitsOf()).equals([A, B, C, D])
	})

	it("requires abstract properties be implemented", () => {
		class A extends Trait<{ abstractMethods: { a(): number } }> {}
		class B extends Trait<{ abstractMethods: { b(): number } }> {}
		// @ts-expect-error
		attest(class C extends implement(A, B, {}) {}).type.errors(
			`Type '{}' is missing the following properties from type '{ b: () => number; a: () => number; }': b, a`
		)
	})

	it("example", () => {
		const square = new Square(5)
		attest(square.area()).equals(25)
		attest(square.perimeter()).equals(20)
		attest(square.isRegular).equals(true)
		attest(square instanceof Square).equals(true)
		attest(square instanceof Rectangle).equals(true)
		attest(square instanceof Rhombus).equals(true)
		attest(square.traitsOf()).equals([Rectangle, Rhombus])
	})
})
