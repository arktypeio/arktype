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
}).types([2836, "instantiations"])

bench("?(1)", () => {
	const r = regex("^a?$")
}).types([483, "instantiations"])

bench("?(4)", () => {
	const r = regex("^a?b?c?d?$")
}).types([1480, "instantiations"])

bench("?(7)", () => {
	const r = regex("^a?b?c?d?e?f?g?$")
}).types([4165, "instantiations"])

bench("escape(6)", () => {
	const r = regex("^\t\n\r\v\f\0$")
}).types([961, "instantiations"])

bench("quantified char", () => {
	const r = regex("^a{5}$")
}).types([592, "instantiations"])

bench("quantified char min max", () => {
	const r = regex("^a{5,10}$")
}).types([681, "instantiations"])

bench("quantified string", () => {
	const r = regex("^.{5,10}$")
}).types([484, "instantiations"])

bench("semver", () => {
	const r = regex("^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$")
}).types([35631, "instantiations"])
