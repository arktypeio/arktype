import {
	$ark,
	messageIn,
	unrenderedLocaleMessage,
	type ArkErrors
} from "@ark/schema"
import { configure } from "arktype/config"
import { strictEqual, throws } from "node:assert/strict"
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
	},
	// ECMA-402's toLocaleString, which Array's passes its locales and options
	toLocaleStringIsTheSummary: () => {
		$ark.config = {}
		const errors = type("string")(5) as ArkErrors
		strictEqual([errors].toLocaleString(["de"]), errors.summary)
	}
})
