import { type } from "arktype"

class A {
	static from(input: "b" | "c") {
		return input === "b" ? new B() : new C()
	}
}

class B extends A {
	static validator = new B()
}

class C extends A {}

A.from("b") //?
