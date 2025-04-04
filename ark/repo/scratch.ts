import { type, type ArkErrors } from "arktype"

const User = type({
	name: "string",
	platform: "'android' | 'ios'",
	"version?": "number | string"
})

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

import { typeJs } from "../docs/components/bundles/type.ts"

new Function(`${typeJs.slice(0, typeJs.lastIndexOf("export {"))}
const MyType = type({
	name: "string",
	age: "number"
})

console.log(MyType.expression)
`)()
