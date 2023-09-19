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

		static and<def>(def: validateTypeRoot<def, Ark>) {
			return class extends TypeConstructor<
				(typeof TypeConstructor)["infer"] & inferTypeRoot<def, Ark>
			> {}
		}
	}
}

class Foo extends Class({ a: "string|number[]" }) {}

const data = new Foo({})

const a = data.a //=>

class Bar extends Foo.and({ b: "boolean" }) {}

const data2 = new Bar({})

const a2 = data2.a //=>
const b = data2.b //=>
