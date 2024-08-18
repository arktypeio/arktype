import type { string } from "../../ast.ts"
import type { Submodule } from "../../module.ts"
import { scope } from "../../scope.ts"
import { regexStringNode } from "./regex.ts"

// Based on https://github.com/validatorjs/validator.js/blob/master/src/lib/isIP.js
const ipv4Segment = "(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])"
const ipv4Address = `(${ipv4Segment}[.]){3}${ipv4Segment}`
const ipv4Matcher = new RegExp(`^${ipv4Address}$`)

const ipv6Segment = "(?:[0-9a-fA-F]{1,4})"
const ipv6Matcher = new RegExp(
	"^(" +
		`(?:${ipv6Segment}:){7}(?:${ipv6Segment}|:)|` +
		`(?:${ipv6Segment}:){6}(?:${ipv4Address}|:${ipv6Segment}|:)|` +
		`(?:${ipv6Segment}:){5}(?::${ipv4Address}|(:${ipv6Segment}){1,2}|:)|` +
		`(?:${ipv6Segment}:){4}(?:(:${ipv6Segment}){0,1}:${ipv4Address}|(:${ipv6Segment}){1,3}|:)|` +
		`(?:${ipv6Segment}:){3}(?:(:${ipv6Segment}){0,2}:${ipv4Address}|(:${ipv6Segment}){1,4}|:)|` +
		`(?:${ipv6Segment}:){2}(?:(:${ipv6Segment}){0,3}:${ipv4Address}|(:${ipv6Segment}){1,5}|:)|` +
		`(?:${ipv6Segment}:){1}(?:(:${ipv6Segment}){0,4}:${ipv4Address}|(:${ipv6Segment}){1,6}|:)|` +
		`(?::((?::${ipv6Segment}){0,5}:${ipv4Address}|(?::${ipv6Segment}){1,7}|:))` +
		")(%[0-9a-zA-Z-.:]{1,})?$"
)

// Based on https://github.com/validatorjs/validator.js/blob/master/src/lib/isUUID.js
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
