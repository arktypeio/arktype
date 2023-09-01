import type { intersectParameters } from "./intersections.js"
import { type AbstractableConstructor } from "./objectKinds.js"

export const compose = <traits extends readonly AbstractableConstructor[]>(
	...traits: traits
) => {
	let result = Object
	for (let i = 0; i < traits.length; i++) {
		result = Object.setPrototypeOf(result, traits[i].prototype)
	}
	return result as {} as compose<traits>
}

export type compose<traits extends readonly AbstractableConstructor[]> =
	composeRecurse<traits, [], {}>

export type composeRecurse<
	traits extends readonly unknown[],
	parameters extends readonly unknown[],
	instance extends {}
> = traits extends readonly [
	infer head extends AbstractableConstructor,
	...infer tail
]
	? composeRecurse<
			tail,
			intersectParameters<parameters, ConstructorParameters<head>>,
			instance & InstanceType<head>
	  >
	: abstract new (...args: parameters) => instance

export abstract class Describable {
	description: string

	abstract writeDefaultDescription(): string

	constructor(rule: unknown, attributes?: { description?: string }) {
		this.description = attributes?.description ?? this.writeDefaultDescription()
	}
}

abstract class Boundable<data> {
	limit: number | undefined

	constructor(rule: { limit?: number }) {
		this.limit = rule.limit
	}

	abstract sizeOf(data: data): number

	check(data: data) {
		return this.limit === undefined || this.sizeOf(data) <= this.limit
	}
}

abstract class Booch {
	booch = true
}

const z = compose(Describable, Boundable, Booch)

class Foo extends z {
	sizeOf(data: unknown) {
		return Number(data)
	}

	writeDefaultDescription() {
		return "foo"
	}
}

const zn = new Foo({ limit: 5 }, {})

zn.check //?

zn.booch //?

zn.writeDefaultDescription() //?
