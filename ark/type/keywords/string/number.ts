import { scope } from "../../scope.ts"

const parsableNumber = regexStringNode(
	wellFormedNumberMatcher,
	"a well-formed numeric string"
).internal as IntersectionNode

// const number = rootNode({
// 	in: parsableNumber,
// 	morphs: (s: string) => Number.parseFloat(s)
// })


export const number = {

}


const submodule = scope(
	{
		$root: ["v4 | v6", "@", "an IP address"],
		v4: regexStringNode(ipv4Matcher, "an IPv4 address"),
		v6: regexStringNode(ipv6Matcher, "an IPv6 address")
	},
	{ prereducedAliases: true }
).export()

export const arkIp = {
	submodule
}

export declare namespace arkIp {
	export type submodule = Submodule<{
		$root: string.narrowed
		v4: string.narrowed
		v6: string.narrowed
	}>
}
