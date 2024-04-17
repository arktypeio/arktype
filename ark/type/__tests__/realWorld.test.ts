import { attest } from "@arktype/attest"
import { scope, type type } from "arktype"
import { describe, it } from "vitest"

class TimeStub {
	declare readonly isoString: string
	/**
	 * @remarks constructor is private to enforce using factory functions
	 */
	private constructor() {}
	/**
	 * Creates a new {@link TimeStub} from an ISO date string
	 * @param isoString - An ISO date string.
	 * @returns A new {@link TimeStub}
	 * @throws TypeError if a string is not provided, or RangeError if item
	 * is not a valid date
	 */
	declare static from: (isoString: string) => TimeStub
	/**
	 * Creates a new {@link TimeStub} from a Javascript `Date`
	 * @param date - A Javascript `Date`
	 * @returns A new {@link TimeStub}
	 */
	declare static fromDate: (date: Date) => TimeStub
	/**
	 * Get a copy of the `TimeStub` converted to a Javascript `Date`. Does not
	 * mutate the existing `TimeStub` value.
	 * @returns A `Date`
	 */
	declare toDate: () => Date
	/**
	 * Override default string conversion
	 * @returns the string representation of a `TimeStub`
	 */
	declare toString: () => string
}

describe("real world", () => {
	it("time stub w/ private constructor", () => {
		const types = scope({
			timeStub: ["instanceof", TimeStub] as type.cast<TimeStub>,
			account: "clientDocument&accountData",
			clientDocument: {
				"id?": "string",
				"coll?": "string",
				"ts?": "timeStub",
				"ttl?": "timeStub"
			},
			accountData: {
				user: "user|timeStub",
				provider: "provider",
				providerUserId: "string"
			},
			user: {
				name: "string",
				"accounts?": "account[]"
			},
			provider: "'GitHub'|'Google'"
		}).export()

		attest(types.account.infer).type.toString.snap()
	})
})
