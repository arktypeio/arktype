import { attest } from "@arktype/attest"
import { compose, trait } from "@arktype/util"
import { suite, test } from "mocha"

suite("traits", () => {
	const describable = trait<
		[unknown, { description?: string }?],
		{ description: string },
		{ writeDefaultDescription: () => string }
	>({
		get description() {
			return this.args[1].description ?? this.writeDefaultDescription()
		}
	})
	const describableBoolean = describable<[boolean]>({
		writeDefaultDescription() {
			return `default description for ${this.args[0]}`
		}
	})
	test("standalone", () => {
		const myDefaultBoolean = describableBoolean(true)
		attest(myDefaultBoolean).typed as {
			readonly args: [
				boolean,
				{
					description?: string
				}?
			]
			writeDefaultDescription: () => string
			description: string
		}
		attest(myDefaultBoolean.description).equals("default description for true")
	})
	test("from input", () => {
		const myDefaultBoolean = describableBoolean(false, {
			description: "custom false"
		})
		attest(myDefaultBoolean.description).equals("custom false")
	})
	type Bound = {
		kind: "min" | "max"
		limit: number
	}

	const boundable = trait<
		[unknown, { bounds?: Bound[] }?],
		{ bounds?: Bound[]; isInBounds(): boolean },
		{ size: number }
	>({
		get bounds() {
			return this.args[0].bounds
		},
		isInBounds() {
			return (
				!this.bounds ||
				this.bounds.every((bound) =>
					bound.kind === "max"
						? this.size < bound.limit
						: this.size > bound.limit
				)
			)
		}
	})
	test("compose", () => {
		const string = compose(
			describable,
			boundable
		)<[string], { isLongerThan(s: unknown): boolean }>({
			writeDefaultDescription: () => "default",
			get size() {
				return this.args[0].length
			},
			// This parameter annotation shouldn't really be allowed, it essentially casts
			isLongerThan(s: string) {
				return this.size > s.length
			}
		})

		const defaults = string("foo")

		attest(defaults.size).equals(3)
		attest(defaults.description).equals("default")
		attest(defaults.isInBounds()).equals(true)
		attest(defaults.isLongerThan("")).equals(true)

		const custom = string("bar", {
			description: "custom",
			bounds: [{ kind: "min", limit: 10 }]
		})
		attest(custom.size).equals(3)
		attest(custom.description).equals("custom")
		attest(custom.isInBounds()).equals(false)
	})
})
