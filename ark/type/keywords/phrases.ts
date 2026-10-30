import { en, type Locale } from "@ark/schema"
import type { KeywordConfig } from "../config.ts"
import { raisedErrorPhrases } from "./functions.ts"

const epoch = "an integer representing a safe Unix timestamp"

/** the English phrase of each builtin keyword whose nodes carry one */
export const keywordPhrases = {
	"FormData.parsed": "an object representing parsed form data",
	"number.epoch": {
		noun: epoch,
		expected: e =>
			e.code === "domain" ? "a number representing a Unix timestamp"
			: e.code === "divisor" ? "an integer representing a Unix timestamp"
			: e.code === "min" ? `a Unix timestamp after ${e.rule}`
			: e.code === "max" ? `a Unix timestamp before ${e.rule}`
			: epoch
	},
	"object.json": "a plain object or array",
	"string.alpha": "only letters",
	"string.alphanumeric": "only letters and digits 0-9",
	"string.base58": "base58-encoded",
	"string.base64": "base64-encoded",
	"string.base64.url": "base64url-encoded",
	"string.capitalize.preformatted": "capitalized",
	"string.creditCard": "a credit card number",
	"string.date": "a parsable date",
	"string.date.epoch": "an integer string representing a safe Unix timestamp",
	"string.date.iso": "an ISO 8601 date or date-time",
	"string.date.parse": "a parsable date",
	"string.digits": "only digits 0-9",
	"string.email": "an email address",
	"string.hex": "hex characters only",
	"string.integer": "a well-formed integer string",
	"string.integer.parse":
		"an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER",
	"string.ip": "an IP address",
	"string.ip.v4": "an IPv4 address",
	"string.ip.v6": "an IPv6 address",
	"string.json": raisedErrorPhrases["string.json"],
	"string.json.parse": raisedErrorPhrases["string.json.parse"],
	"string.lower.preformatted": "lowercase",
	"string.normalize.NFC.preformatted": "NFC-normalized unicode",
	"string.normalize.NFD.preformatted": "NFD-normalized unicode",
	"string.normalize.NFKC.preformatted": "NFKC-normalized unicode",
	"string.normalize.NFKD.preformatted": "NFKD-normalized unicode",
	"string.numeric": "a well-formed numeric string",
	"string.numeric.parse": "finite",
	"string.regex": raisedErrorPhrases["string.regex"],
	"string.semver": "a semantic version (see https://semver.org/)",
	"string.trim.preformatted": "trimmed",
	"string.upper.preformatted": "uppercase",
	"string.url": "a URL string",
	"string.url.parse": "a URL string",
	"string.uuid": "a UUID",
	"string.uuid.v1": "a UUIDv1",
	"string.uuid.v2": "a UUIDv2",
	"string.uuid.v3": "a UUIDv3",
	"string.uuid.v4": "a UUIDv4",
	"string.uuid.v5": "a UUIDv5",
	"string.uuid.v6": "a UUIDv6",
	"string.uuid.v7": "a UUIDv7",
	"string.uuid.v8": "a UUIDv8"
} as const satisfies {
	readonly [alias in keyof KeywordConfig]?: Locale.KeywordPhrase
}

export type KeywordPhraseAlias = keyof typeof keywordPhrases

// every resolved config shares schema's en, so it gains the phrases in place
Object.assign(en.keywordPhrases, keywordPhrases)

const nounOf = (alias: KeywordPhraseAlias): string => {
	const phrase: Locale.KeywordPhrase = keywordPhrases[alias]
	return typeof phrase === "string" ? phrase : phrase.noun
}

/** meta for a node its keyword's phrase describes */
export const keywordMeta = <alias extends KeywordPhraseAlias>(
	alias: alias
): { description: string; keyword: alias } => ({
	description: nounOf(alias),
	keyword: alias
})
