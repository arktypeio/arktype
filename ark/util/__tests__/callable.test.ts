import { attest } from "@arktype/attest"
import { Callable } from "@arktype/util"

describe("callable", () => {
	class Sub extends Callable<(name: string) => string> {
		constructor() {
			super((name: string) => "Hello: " + this.salutation + name)
		}
		salutation = "Mr. "
		doSomething() {
			return this.salutation + "doSomething"
		}
	}
	it("can be extended", () => {
		const f = new Sub()
		attest(f instanceof Sub).equals(true)
		attest(f instanceof Callable).equals(true)
		attest(f("ff")).snap("Hello: Mr. ff")
		attest(f.doSomething()).snap("Mr. doSomething")
	})
	it("subclasses can be chained", () => {
		class SecondSub extends Sub {
			salutation = "Ms."
		}
		const f = new SecondSub()
		attest(f instanceof SecondSub).equals(true)
		attest(f instanceof Sub).equals(true)
		attest(f instanceof Callable).equals(true)
		attest(f("ff")).snap("Hello: Ms.ff")
		attest(f.doSomething()).snap("Ms.doSomething")
	})
	it("can attach properties", () => {
		const s = new Callable(() => 1, { attach: { a: 2 } })

		attest(s()).equals(1)
		attest(s.a).equals(2)
	})
	it("can attach properties", () => {
		// inferred directly from constructor
		const s = new Callable(() => 1 as const, { attach: { a: 2 } } as const)

		attest<1>(s()).equals(1)
		attest<2>(s.a).equals(2)
	})
	it("can attach properties to a subclass", () => {
		class Foo<attach extends object> extends Callable<() => 0, attach> {
			constructor(attach: attach) {
				super(() => 0, { attach })
			}

			b() {
				return 2 as const
			}
		}

		const foo = new Foo({ a: 1 } as const)
		attest(foo instanceof Foo).equals(true)
		attest(foo instanceof Callable).equals(true)
		// callable preserved
		attest<0>(foo()).snap(0)
		// attachments present
		attest<1>(foo.a).snap(1)
		// subclass methods preserved
		attest<2>(foo.b()).snap(2)
	})
})
