import { DynamicBase } from "@ark/util"
import {
	type,
	type inferAmbient,
	type inferTypeRoot,
	type validateAmbient,
	type validateTypeRoot
} from "arktype"

const Class = <def>(def: validateAmbient<def>) => {
	const validator = type(def as never)

	return class TypeConstructor<t = inferAmbient<def>> extends DynamicBase<
		t & object
	> {
		static infer: inferAmbient<def>

		constructor(input: unknown) {
			const out = validator(input)
			if (out instanceof type.errors) {
				return out.throw()
			}
			super(out as never)
		}

		static and<cls extends typeof TypeConstructor, andDef>(
			this: cls,
			def: validateAmbient<andDef>
		) {
			return class extends (this as typeof TypeConstructor<
				InstanceType<cls> & inferAmbient<andDef>
			>) {
				static infer: cls["infer"] & inferAmbient<andDef>
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
