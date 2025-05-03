import { bench } from "@ark/attest"
import { regex } from "@ark/regex"
import type { array } from "@ark/util"

bench.baseline(() => {
	regex("foo|^bar$|baz?")
})

type Result = array.repeat<3, 50>

bench("repeat(100)", () => {
	type Result = array.repeat<2, 100>
}).types([713, "instantiations"])

bench("repeat(500)", () => {
	type Result = array.repeat<2, 500>
}).types([3616, "instantiations"])

bench("repeat(512)", () => {
	type Result = array.repeat<2, 512>
}).types([560, "instantiations"])

bench("repeat(513)", () => {
	type Result = array.repeat<2, 513>
}).types([5988, "instantiations"])

bench("anchored union", () => {
	const r = regex("typescript|^go$|brrr$")
}).types([2438, "instantiations"])

bench("?(1)", () => {
	const r = regex("^a?$")
}).types([473, "instantiations"])

bench("?(4)", () => {
	const r = regex("^a?b?c?d?$")
}).types([1613, "instantiations"])

bench("?(7)", () => {
	const r = regex("^a?b?c?d?e?f?g?$")
}).types([4462, "instantiations"])

bench("escape(6)", () => {
	const r = regex("^\t\n\r\v\f\0$")
}).types([960, "instantiations"])
