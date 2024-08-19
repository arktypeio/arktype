import {
	ArkErrors,
	intrinsic,
	rootNode,
	type IntersectionNode
} from "@ark/schema"
import { isWellFormedInteger, wellFormedNumberMatcher } from "@ark/util"
import type { number, Out, string } from "../ast.ts"
import type { Module, Submodule } from "../module.ts"
import { scope } from "../scope.ts"
import { arkNumber } from "./number.ts"
import { iso8601Matcher, tryParseDatePattern } from "./string/dates.ts"
import { arkIp } from "./string/ip.ts"
import { arkUuid } from "./string/uuid.ts"

const submodule: Module<arkString.submodule> = scope(
	{
		$root: intrinsic.string,
		numeric: numericString,
		integer: integerString,
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
		numeric: string.narrowed
		integer: Submodule<{
			$root: string.integer
			parse: (In: string.integer) => Out<number.divisibleBy<1>>
		}>
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
