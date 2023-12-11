import { attest } from "@arktype/attest"
import { Trait, compose } from "../trait2.js"

export class Describable extends Trait<{ writeDefaultDescription(): string }> {
	description: string

	constructor(rule: unknown, attributes?: { description?: string }) {
		super()
		this.description = attributes?.description ?? this.writeDefaultDescription()
	}
}

export class Boundable<data> extends Trait<{ sizeOf(data: data): number }> {
	limit: number | undefined

	constructor(rule: { limit?: number }) {
		super()
		this.limit = rule.limit
	}

	check(data: data) {
		return this.limit === undefined || this.sizeOf(data) <= this.limit
	}
}

const z = compose(
	Describable,
	Boundable<string>
)({
	sizeOf(data: string) {
		return data.length
	},
	writeDefaultDescription() {
		return "foo"
	}
})

describe("traits", () => {
	it("compose", () => {
		class StringChecker extends compose(Describable, Boundable<string>) {
			sizeOf(data: string) {
				return data.length
			}

			writeDefaultDescription() {
				return "foo"
			}
		}

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
				{
					description?: string
				}?
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
		abstract class Foo extends Boundable<number> {
			getFoo() {
				return "foo"
			}
		}
		class Bar extends compose(Foo) {
			sizeOf(data: number) {
				return data
			}
		}
		const b = new Bar({ limit: 2 })
		attest(b.check(1)).equals(true)
		attest(b.check(3)).equals(false)
		attest(b.getFoo()).equals("foo")
	})
	it("preserves static", () => {
		abstract class A extends Trait {
			static readonly a = "a"

			readonly a = "a"
		}
		abstract class B extends Trait {
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
		abstract class A extends Trait {
			readonly a = "a"
		}
		abstract class B extends Trait {
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
		abstract class A {
			abstract a(): number
		}
		abstract class B {
			abstract b(): number
		}
		// @ts-expect-error
		attest(class C extends compose(A, B) {}).type.errors.snap()
	})
	// https://github.com/microsoft/TypeScript/issues/56738
	// it("requires duplicate abstract properties be implemented", () => {
	// 	abstract class A1 {
	// 		abstract a(): number
	// 	}
	// 	abstract class A2 {
	// 		abstract a(): number
	// 	}
	// 	// @ts-expect-error
	// 	attest(class A3 extends compose(A1, A2) {}).type.errors.snap()
	// })
	it("can disambiguate", () => {
		abstract class Rhombus extends Trait {
			constructor(public sideLength: number) {
				super()
			}

			abstract area(): number
		}

		abstract class Rectangle extends Trait {
			constructor(
				public width: number,
				public height: number
			) {
				super()
			}

			abstract area(): number
		}

		class Square extends compose([Rhombus, Rectangle], { area: Rhombus }) {
			constructor(sideLength: number) {
				super(sideLength, sideLength)
			}
		}
		const square = new Square(5)
		attest(square.area()).equals(25)
		attest(square instanceof Square).equals(true)
		attest(square instanceof Rhombus).equals(true)
		attest(square instanceof Rectangle).equals(true)
	})
})
