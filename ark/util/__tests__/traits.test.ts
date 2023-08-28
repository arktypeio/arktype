import { attest } from "@arktype/attest"
import type {
	AbstractableConstructor,
	conform,
	error,
	TraitDeclaration
} from "@arktype/util"
import { compose, DynamicBase, trait } from "@arktype/util"
import { suite, test } from "mocha"

// declare abstract class Describable {
// 	constructor(rule: unknown, attributes: { description?: string })
// 	description: string
// 	protected writeDefaultDescription(): string
// }

// @ts-expect-error (otherwise can't dynamically add abstracted props)
export abstract class Trait<
	abstracts extends object = {}
> extends DynamicBase<abstracts> {
	constructor(abstracts: abstracts) {
		super(abstracts)
	}
	abstract args: readonly unknown[]
}

const implement = <
	trait extends AbstractableConstructor<Trait>,
	implementation
>(
	trait: trait,
	implementation: conform<
		implementation & ThisType<InstanceType<trait>>,
		ConstructorParameters<trait>[0]
	>
) => implementation

class Describable extends Trait<{
	writeDefaultDescription: () => string
}> {
	declare args: [rule: unknown, attributes: { description?: string }]

	get description() {
		return this.args[1].description ?? this.writeDefaultDescription()
	}
}

const z = implement(Describable, {
	//       ^?
	writeDefaultDescription() {
		return this.args[1].description ?? this.writeDefaultDescription()
	}
})

// export const describable = trait<Describable>({
// 	get description() {
// 		return ""
// 		// return this.args[1].description ?? this.writeDefaultDescription()
// 	}
// })

// abstract class Boundable extends Trait {
// 	declare args: [rule: { bounds: number[] }]

// 	get bounds() {
// 		return this.args[0].bounds
// 	}

// 	protected abstract size: number
// }

// suite("traits", () => {
// 	const describable = trait<
// 		[unknown, { description?: string }?],
// 		{ description: string },
// 		{ writeDefaultDescription: () => string }
// 	>({
// 		get description() {
// 			return this.args[1].description ?? this.writeDefaultDescription()
// 		}
// 	})
// 	const describableBoolean = describable<[boolean]>({
// 		writeDefaultDescription() {
// 			return `default description for ${this.args[0]}`
// 		}
// 	})
// 	test("standalone", () => {
// 		const myDefaultBoolean = describableBoolean(true)
// 		attest(myDefaultBoolean).typed as {
// 			readonly args: [
// 				boolean,
// 				{
// 					description?: string
// 				}?
// 			]
// 			writeDefaultDescription: () => string
// 			description: string
// 		}
// 		attest(myDefaultBoolean.description).equals("default description for true")
// 	})
// 	test("from input", () => {
// 		const myDefaultBoolean = describableBoolean(false, {
// 			description: "custom false"
// 		})
// 		attest(myDefaultBoolean.description).equals("custom false")
// 	})
// 	type Bound = {
// 		kind: "min" | "max"
// 		limit: number
// 	}

// 	const boundable = trait<
// 		[unknown, { bounds?: Bound[] }?],
// 		{ bounds?: Bound[]; isInBounds(): boolean },
// 		{ size: number }
// 	>({
// 		get bounds() {
// 			return this.args[0].bounds
// 		},
// 		isInBounds() {
// 			return (
// 				!this.bounds ||
// 				this.bounds.every((bound) =>
// 					bound.kind === "max"
// 						? this.size < bound.limit
// 						: this.size > bound.limit
// 				)
// 			)
// 		}
// 	})
// 	test("compose", () => {
// 		const string = compose(
// 			describable,
// 			boundable
// 		)<[string], { isLongerThan(s: unknown): boolean }>({
// 			writeDefaultDescription: () => "default",
// 			get size() {
// 				return this.args[0].length
// 			},
// 			// This parameter annotation shouldn't really be allowed, it essentially casts
// 			isLongerThan(s: string) {
// 				return this.size > s.length
// 			}
// 		})

// 		const defaults = string("foo")

// 		attest(defaults.size).equals(3)
// 		attest(defaults.description).equals("default")
// 		attest(defaults.isInBounds()).equals(true)
// 		attest(defaults.isLongerThan("")).equals(true)

// 		const custom = string("bar", {
// 			description: "custom",
// 			bounds: [{ kind: "min", limit: 10 }]
// 		})
// 		attest(custom.size).equals(3)
// 		attest(custom.description).equals("custom")
// 		attest(custom.isInBounds()).equals(false)
// 	})
// })
