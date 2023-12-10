import { attest } from "@arktype/attest"
import { Trait, compose } from "@arktype/util"

export abstract class Describable extends Trait {
	description: string

	abstract writeDefaultDescription(): string

	constructor(rule: unknown, attributes?: { description?: string }) {
		super()
		this.description = attributes?.description ?? this.writeDefaultDescription()
	}
}

export abstract class Boundable<data> extends Trait {
	limit: number | undefined

	constructor(rule: { limit?: number }) {
		super()
		this.limit = rule.limit
	}

	abstract sizeOf(data: data): number

	check(data: data) {
		return this.limit === undefined || this.sizeOf(data) <= this.limit
	}
}

class StringChecker extends compose(Describable, Boundable<string>) {
	sizeOf(data: string) {
		return data.length
	}
	writeDefaultDescription() {
		return "foo"
	}
}

const shortString = new StringChecker(
	{ limit: 5 },
	{ description: "a short string" }
)
attest(shortString.check("foo")).equals(true)
attest(shortString.check("toolong")).equals(false)
attest(shortString.description).equals("a short string")
attest(shortString.writeDefaultDescription()).equals("foo")
attest([
	shortString instanceof StringChecker,
	shortString instanceof Boundable,
	shortString instanceof Describable
]).equals([true, true, true])

describe("traits", () => {
	it("compose", () => {
		class StringChecker extends compose(Describable, Boundable<string>) {
			sizeOf(data: string) {
				return data.length
			}

			writeDefaultDescription() {
				return "foo"
			}
		}

		const shortString = new StringChecker(
			{ limit: 5 },
			{ description: "a short string" }
		)

		type Params = ConstructorParameters<typeof StringChecker>
		attest<
			[
				{
					limit?: number
				},
				{
					description?: string
				}?
			],
			Params
		>()
		attest(shortString.check("foo")).equals(true)
		attest(shortString.check("toolong")).equals(false)
		attest(shortString.description).equals("a short string")
		attest(shortString.writeDefaultDescription()).equals("foo")

		const withDefault = new StringChecker({ limit: 5 })
		attest(withDefault.description).equals("foo")
		attest([
			withDefault instanceof StringChecker,
			withDefault instanceof Boundable,
			withDefault instanceof Describable
		]).equals([true, true, true])
	})
})
