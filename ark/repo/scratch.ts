import { type } from "arktype"

const User = type({
	name: "string",
	platform: "'android' | 'ios'",
	"version?": "number | string"
})

User.internal.withMeta

const selected = User.select({
	kind: "domain",
	where: d => d.domain === "string"
})

const ConfiguredUser = User.configure(
	{ description: "A STRING" },
	{
		kind: "domain",
		where: d => d.domain === "string"
	}
)

ConfiguredUser.get("name").description // A STRING
ConfiguredUser.get("platform").description // "android" | "ios"
ConfiguredUser.get("version").description // a number, A STRING or undefined
