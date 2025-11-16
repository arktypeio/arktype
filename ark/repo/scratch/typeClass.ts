import { DynamicBase } from "@ark/util"
import { type } from "arktype"

const Class = <const def>(def: type.validate<def>) => {
	const Validator = type(def as never)

	return class TypeConstructor<t = type.infer<def>> extends DynamicBase<
		t & object
	> {
		static infer: type.infer<def>

		constructor(input: unknown) {
			const out = Validator(input)
			if (out instanceof type.errors) {
				return out.throw()
			}
			super(out as never)
		}

		static and<cls extends typeof TypeConstructor<any>, andDef>(
			this: cls,
			def: type.validate<andDef>
		) {
			return class extends (this as typeof TypeConstructor<
				InstanceType<cls> & type.infer<andDef>
			>) {
				static infer: cls["infer"] & type.infer<andDef>
			}
		}
	}
}

class Foo extends Class({ a: "string|number[]" }) {
	getA() {
		return this.a
	}
}

const data = new Foo({}) //=>

const a = data.a //=>

class Bar extends Foo.and({ b: "boolean" }) {
	getB() {
		return this.b
	}
}

type Z = typeof Bar.infer //=>

const data2 = new Bar({}) //=>

const implemented = data2.getB() //=>
const inherited = data2.getA() //=>

const a2 = data2.a //=>
const b = data2.b //=>
