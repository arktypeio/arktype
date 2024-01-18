import { attest } from "@arktype/attest"
import { Callable, type conform, type Hkt } from "@arktype/util"

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
	it("can be subtyped", () => {
		const f = new Sub()
		attest(f instanceof Sub).equals(true)
		attest(f instanceof Callable).equals(true)
		attest(f("ff")).snap("Hello: Mr. ff")
		attest(f.doSomething()).snap("Mr. doSomething")
	})
	it("subtypes can be chained", () => {
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
})
