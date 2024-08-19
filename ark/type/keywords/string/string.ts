import { intrinsic, rootNode } from "@ark/schema"
import type { Out, string } from "../../ast.ts"
import type { Module, Submodule } from "../../module.ts"
import { scope } from "../../scope.ts"
import { epoch } from "../number/number.ts"
import { creditCard } from "./creditCard.ts"
import { integer } from "./integer.ts"
import { arkIp } from "./ip.ts"
import { numeric } from "./numeric.ts"
import { regexStringNode } from "./utils.ts"
import { arkUuid } from "./uuid.ts"

// https://www.regular-expressions.info/email.html
const emailMatcher = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

export const email = regexStringNode(emailMatcher, "an email address")

// https://semver.org/
const semverMatcher =
	/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

export const semver = regexStringNode(
	semverMatcher,
	"a semantic version (see https://semver.org/)"
)

const submodule: Module<arkString.submodule> = scope(
	{
		$root: intrinsic.string,
		numeric,
		integer,
		alpha: regexStringNode(/^[A-Za-z]*$/, "only letters"),
		alphanumeric: regexStringNode(
			/^[A-Za-z\d]*$/,
			"only letters and digits 0-9"
		),
		digits: regexStringNode(/^\d*$/, "only digits 0-9"),
		lower: regexStringNode(/^[a-z]*$/, "only lowercase letters"),
		upper: regexStringNode(/^[A-Z]*$/, "only uppercase letters"),
		iso8601,
		epoch,
		json,
		semver,
		ip: arkIp.submodule,
		creditCard,
		email,
		uuid: arkUuid.submodule,
		url,

		// formatting
		trim: rootNode({
			in: "string",
			morphs: (s: string) => s.trim()
		}),
		toUpper: rootNode({
			in: "string",
			morphs: (s: string) => s.toUpperCase()
		}),
		toLower: rootNode({
			in: "string",
			morphs: (s: string) => s.toLowerCase()
		}),
		capitalize: rootNode({
			in: "string",
			morphs: (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
		}),
		normalize: rootNode({
			in: "string",
			morphs: (s: string) => s.normalize()
		})
	},
	{
		prereducedAliases: true
	}
).export()

export const arkString = {
	submodule
}

export declare namespace arkString {
	export type submodule = Submodule<{
		$root: string
		alpha: string.narrowed
		alphanumeric: string.narrowed
		digits: string.narrowed
		lower: string.narrowed
		upper: string.narrowed
		numeric: numeric
		integer: integer
		iso8601: string.narrowed
		epoch: string.narrowed
		creditCard: string.narrowed
		email: string.narrowed
		uuid: arkUuid.submodule

		semver: string.narrowed
		ip: arkIp.submodule

		// formatting
		trim: (In: string) => Out<string>
		toUpper: (In: string) => Out<string>
		toLower: (In: string) => Out<string>
		capitalize: (In: string) => Out<string>
		normalize: (In: string) => Out<string>

		number: (In: string) => Out<number>
		date: (In: string) => Out<Date>
		json: (In: string) => Out<object>
	}>
}
