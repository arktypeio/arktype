import { attest } from "@arktype/attest"
import { compose } from "@arktype/util"

abstract class Describable {
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

suite("traits", () => {
	test("compose", () => {
		class StringChecker extends compose(Describable, Boundable) {
			sizeOf(data: unknown) {
				return Number(data)
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
		attest({} as Params).typed as [
			{
				limit?: number
			},
			{
				description?: string
			}?
		]
		attest(shortString.check("foo")).equals(true)
		attest(shortString.check("toolong")).equals(false)
	})
	test("compose with labels", () => {
		abstract class Labeled extends compose<[rule: 1, attributes: 1]>()(
			Describable,
			Boundable
		) {}

		const t = {} as ConstructorParameters<typeof Labeled>
		attest(t).types.toString.snap()
	})
})
