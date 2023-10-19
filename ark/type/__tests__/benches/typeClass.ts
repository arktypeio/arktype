import { DynamicBase } from "@arktype/util"
import { ark, type Ark } from "../../scopes/ark.js"
import { type inferTypeRoot, Type, type validateTypeRoot } from "../../type.js"

const Class = <def>(def: validateTypeRoot<def, Ark>) => {
	const validator = new Type(def, ark)

	return class TypeConstructor<t = inferTypeRoot<def, Ark>> extends DynamicBase<
		t & object
	> {
		static infer: inferTypeRoot<def, Ark>

		constructor(input: unknown) {
			const { data, problems } = validator(input)
			if (problems) {
				return problems.throw()
			}
			super(data as never)
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

class Bar extends Foo.and({ b: "boolean" }) {}

type Z = typeof Bar.infer //=>

const data2 = new Bar({}) //=>

const inherited = data2.getA() //=>

const a2 = data2.a //=>
const b = data2.b //=>
