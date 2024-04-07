import type { Ark } from "@arktype/schema"
import { DynamicBase } from "@arktype/util"
import { ambient, type } from "../../type/ark.js"
import type { inferTypeRoot, validateTypeRoot } from "../../type/type.js"

const Class = <def>(def: validateTypeRoot<def, Ark>) => {
	const validator = type(def as never)

	return class TypeConstructor<
		t = inferTypeRoot<def, Ark>
	> extends DynamicBase<t & object> {
		static infer: inferTypeRoot<def, Ark>

		constructor(input: unknown) {
			const { out, errors } = validator(input)
			if (errors) {
				return errors.throw()
			}
			super(out as never)
		}

		static and<cls extends typeof TypeConstructor, andDef>(
			this: cls,
			def: validateTypeRoot<andDef, Ark>
		) {
			return class extends (this as typeof TypeConstructor<
				InstanceType<cls> & inferTypeRoot<andDef, Ark>
			>) {
				static infer: cls["infer"] & inferTypeRoot<andDef, Ark>
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
