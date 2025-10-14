import { attest, contextualize } from "@ark/attest"
import { Callable } from "@ark/util"

contextualize(() => {
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

			getAttached<k extends keyof attach>(k: k): attach[k] {
				return (this as any)[k]
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
		// can access attached on methods
		attest<1>(foo.getAttached("a")).snap(1)
	})

	it("can access attached properties and prototype methods", () => {
		class GetAttached<attach extends object> extends Callable<
			<k extends keyof attach>(k: k) => attach[k],
			attach
		> {
			constructor(attach: attach) {
				super(<k extends keyof attach>(k: k) => this.protoGetAttached(k), {
					attach
				})
			}

			protoGetAttached(k: PropertyKey) {
				return (this as any)[k]
			}

			getAttached<k extends keyof attach>(k: k): attach[k] {
				return this(k)
			}
		}

		const foo = new GetAttached({ a: 1 } as const)
		attest<1>(foo.a).equals(1)
		attest<1>(foo.getAttached("a")).equals(1)
		attest<1>(foo("a")).equals(1)
	})

	it("preserves original name", () => {
		const f = new Callable(function originalName() {})

		attest(f.name).snap("bound originalName")
	})
})
