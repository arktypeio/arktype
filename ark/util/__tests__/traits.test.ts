import { attest } from "@arktype/attest"
import { compose, implement, Trait } from "@arktype/util"

suite("traits", () => {
	class Describable extends Trait<
		// declare input
		[rule: unknown, attributes?: { description?: string }],
		{ description: string },
		{
			// declare any abstract props here
			writeDefaultDescription: () => string
		}
	> {
		protected initialize = () => ({
			// you can use inputs/abstract props in whatever you implement, it's available via this
			description: this.args[1]?.description ?? this.writeDefaultDescription()
		})
	}
	const describableFoo = implement(Describable)({
		writeDefaultDescription: () => "default foo" as const,
		other: () => "bar"
	})
	test("standalone", () => {
		const myDefaultFoo = describableFoo({})
		attest(myDefaultFoo).typed as {
			args: [
				rule: unknown,
				attributes?: {
					description?: string
				}
			]
			readonly description: string
			writeDefaultDescription: () => "default foo"
			other: () => "bar"
		}
		attest(myDefaultFoo.description).equals("default description for true")
	})
	test("from input", () => {
		const myCustomFoo = describableFoo(false, {
			description: "custom foo"
		})
		attest(myCustomFoo.description).equals("custom foo")
	})

	class Boundable<data> extends Trait<
		[rule: { limit?: number }],
		{ limit: number | undefined },
		{
			sizeOf: (data: data) => number
		}
	> {
		protected initialize = () => ({
			limit: this.args[0].limit
		})

		check(data: data) {
			return this.limit === undefined || this.sizeOf(data) <= this.limit
		}
	}

	test("compose", () => {
		const string = implement(
			Boundable<string>,
			Describable
		)({
			sizeOf: (data) => data.length,
			writeDefaultDescription: () => "a string"
		})
		const shortString = string({ limit: 5 }, { description: "a short string" })
		attest(shortString).typed as {
			args: [
				{
					limit?: number
				},
				{
					description?: string
				}?
			]
			readonly limit: number | undefined
			check: (data: unknown) => boolean
			readonly description: string
		}
		attest(shortString.check("foo")).equals(true)
		attest(shortString.check("toolong")).equals(false)
	})
})

abstract class Foo extends Trait<[name: string]> {
	get name() {
		return this.args[0]
	}

	scream() {
		return this.name.toUpperCase()
	}
}

const from = implement(Foo)({
	get name() {
		return ""
	},
	get bar() {
		return this.name
	}
})
