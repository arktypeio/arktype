import { bench } from "@ark/attest"
import { regex } from "@ark/regex"
import type { array } from "@ark/util"

bench.baseline(() => {
	regex("foo|^bar$|baz{9,10}?")
})

const r = regex("a?(b|cd)")

type Result = array.repeat<3, 50>

bench("repeat(100)", () => {
	type Result = array.repeat<2, 100>
}).types([678, "instantiations"])

bench("repeat(500)", () => {
	type Result = array.repeat<2, 500>
}).types([3552, "instantiations"])

bench("repeat(512)", () => {
	type Result = array.repeat<2, 512>
}).types([557, "instantiations"])

bench("repeat(513)", () => {
	type Result = array.repeat<2, 513>
}).types([5968, "instantiations"])

bench("anchored union", () => {
	const r = regex("typescript|^go$|brrr$")
}).types([1755, "instantiations"])

bench("?(1)", () => {
	const r = regex("^a?$")
}).types([495, "instantiations"])

bench("?(4)", () => {
	const r = regex("^a?b?c?d?$")
}).types([1420, "instantiations"])

bench("?(7)", () => {
	const r = regex("^a?b?c?d?e?f?g?$")
}).types([4033, "instantiations"])

bench("?(15)", () => {
	const r = regex("^ab?c?d?e?f?g?h?i?j?k?l?m?n?o?$")
}).types([282180, "instantiations"])

bench("escape(6)", () => {
	const r = regex("^\t\n\r\v\f\0$")
}).types([509, "instantiations"])

bench("quantified char", () => {
	const r = regex("^a{5}$")
}).types([605, "instantiations"])

bench("quantified char min max", () => {
	const r = regex("^a{5,10}$")
}).types([694, "instantiations"])

bench("quantified string", () => {
	const r = regex("^.{5,10}$")
}).types([496, "instantiations"])

bench("semver", () => {
	const r = regex("^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$")
}).types([35531, "instantiations"])

// Literals
bench("literal basic", () => {
	const r = regex("abcdef")
}).types([426, "instantiations"])

bench("literal long", () => {
	const r = regex("abcdefghijklmnopqrstuvwxyz")
}).types([1580, "instantiations"])

// Anchors
bench("anchor start", () => {
	const r = regex("^abc")
}).types([294, "instantiations"])

bench("anchor end", () => {
	const r = regex("abc$")
}).types([305, "instantiations"])
bench("anchor both", () => {
	const r = regex("^abc$")
}).types([329, "instantiations"])

bench("anchor union(2)", () => {
	const r = regex("^foo|bar$")
}).types([963, "instantiations"])

bench("anchor union(5)", () => {
	const r = regex("^foo|^bar|baz$|qux|^end")
}).types([1994, "instantiations"])

// Unions
bench("union(2)", () => {
	const r = regex("a|b")
}).types([659, "instantiations"])

bench("union(5)", () => {
	const r = regex("a|b|c|d|e")
}).types([1265, "instantiations"])

bench("union(10)", () => {
	const r = regex("a|b|c|d|e|f|g|h|i|j")
}).types([2307, "instantiations"])

bench("union nested", () => {
	const r = regex("(a|b)(c|d)(e|f)")
}).types([6809, "instantiations"])

// Quantifiers - ranges
bench("range {1,3}", () => {
	const r = regex("^a{1,3}$")
}).types([584, "instantiations"])

bench("range {2,8}", () => {
	const r = regex("^a{2,8}$")
}).types([696, "instantiations"])

bench("range {0,5}", () => {
	const r = regex("^a{0,5}$")
}).types([677, "instantiations"])

bench("range complex", () => {
	const r = regex("^a{1,2}b{2,3}c{0,2}$")
}).types([1326, "instantiations"])

// Character sets
bench("charset simple", () => {
	const r = regex("[abc]")
}).types([686, "instantiations"])

bench("charset range", () => {
	const r = regex("[a-z]")
}).types([632, "instantiations"])

bench("charset mixed", () => {
	const r = regex("[a-zA-Z0-9]")
}).types([893, "instantiations"])

bench("charset negated", () => {
	const r = regex("[^abc]")
}).types([307, "instantiations"])

// Escapes
bench("escape shorthand", () => {
	const r = regex("\\d\\w\\s")
}).types([529, "instantiations"])

bench("escape builtin", () => {
	const r = regex("\t\n\r\v\f\0")
}).types([436, "instantiations"])

// Groups - Captures
bench("group single", () => {
	const r = regex("(abc)")
}).types([447, "instantiations"])

bench("group nested(2)", () => {
	const r = regex("(a(b)c)")
}).types([902, "instantiations"])

bench("group nested(3)", () => {
	const r = regex("(a(b(c)d)e)")
}).types([1622, "instantiations"])

bench("group union", () => {
	const r = regex("(a|b|c)")
}).types([1215, "instantiations"])

bench("group quantified", () => {
	const r = regex("(ab){1,3}")
}).types([734, "instantiations"])

// Non-capturing groups
bench("group non-capturing", () => {
	const r = regex("(?:abc)")
}).types([403, "instantiations"])

bench("group mixed capturing", () => {
	const r = regex("(a)(?:b)(c)")
}).types([1120, "instantiations"])

// Backreferences
bench("backref simple", () => {
	const r = regex("(a)\\1")
}).types([757, "instantiations"])

bench("backref union", () => {
	const r = regex("(a|b)\\1")
}).types([1497, "instantiations"])

bench("backref multiple", () => {
	const r = regex("(a)(b)\\1\\2")
}).types([1370, "instantiations"])

// Named captures
bench("named capture", () => {
	const r = regex("(?<name>abc)")
}).types([627, "instantiations"])

bench("named backref", () => {
	const r = regex("(?<name>a|b)\\k<name>")
}).types([1706, "instantiations"])

// Complex patterns
bench("email pattern", () => {
	const r = regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")
}).types([3058, "instantiations"])

bench("phone pattern", () => {
	const r = regex("^\\(?([0-9]{3})\\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$")
}).types([13101, "instantiations"])

// Scaling tests
bench("wildcard sequence(5)", () => {
	const r = regex(".....$")
}).types([322, "instantiations"])

bench("wildcard sequence(10)", () => {
	const r = regex("..........$")
}).types([467, "instantiations"])

bench("nested groups(4)", () => {
	const r = regex("((((a))))")
}).types([1507, "instantiations"])

bench("mixed complexity", () => {
	const r = regex(
		"^((?:https?://)?(?:www\\.)?([a-zA-Z0-9-]+)\\.(com|org|net))(/.*)?$"
	)
}).types([10021, "instantiations"])
