import { attest } from "@arktype/attest"
import { compose } from "@arktype/util"

export abstract class Describable {
	description: string

	abstract writeDefaultDescription(): string

	constructor(rule: unknown, attributes?: { description?: string }) {
		this.description = attributes?.description ?? this.writeDefaultDescription()
	}
}

export abstract class Boundable<data> {
	limit: number | undefined

	constructor(rule: { limit?: number }) {
		this.limit = rule.limit
	}

	abstract sizeOf(data: data): number

	check(data: data) {
		return this.limit === undefined || this.sizeOf(data) <= this.limit
	}
}

describe("traits", () => {
	it("compose", () => {
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
	})
	it("compose with labels", () => {
		abstract class Labeled extends compose<[rule: 1, attributes: 1]>()(
			Describable,
			Boundable
		) {}

		const t = {} as ConstructorParameters<typeof Labeled>
		attest(t).type.toString.snap(
			"[rule: { limit?: number; }, attributes: { description?: string; } | undefined]"
		)
	})
})
