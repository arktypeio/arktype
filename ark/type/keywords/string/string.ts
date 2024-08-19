import { wellFormedIntegerMatcher, wellFormedNumberMatcher } from "@ark/util"
import { regexStringNode } from "./utils.ts"

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

export const numericString = regexStringNode(
	wellFormedNumberMatcher,
	"a well-formed numeric string"
)

export const integerString = regexStringNode(
	wellFormedIntegerMatcher,
	"a well-formed integer string"
)
