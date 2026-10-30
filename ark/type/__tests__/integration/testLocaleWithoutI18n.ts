import {
	$ark,
	messageIn,
	unrenderedLocaleMessage,
	type ArkErrors
} from "@ark/schema"
import { configure } from "arktype/config"
import { throws } from "node:assert/strict"
import { cases } from "./util.ts"

const locale = { tag: "test" } as never

configure({ locale })

const { type } = await import("arktype")

cases({
	configuredLocaleThrowsWhenATypeIsCreated: () =>
		throws(() => type("string"), { message: unrenderedLocaleMessage }),
	passedLocaleThrowsWhenAnErrorIsWritten: () => {
		$ark.config = {}
		const error = (type("string")(5) as ArkErrors).issues[0]
		throws(() => messageIn(error, locale), { message: unrenderedLocaleMessage })
	}
})
