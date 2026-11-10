import { locale } from "./localeConfig.ts"

import { $ark } from "@ark/schema"
import { type } from "arktype"
import { en } from "arktype/locales/en"
import { strictEqual } from "node:assert/strict"
import { cases } from "./util.ts"

cases({
	resolvedFromTheConfigWhenATypeIsCreated: () => {
		strictEqual($ark.cfg, undefined)
		type("string")
		strictEqual($ark.cfg!.locale.tag, locale.tag)
		strictEqual($ark.cfg!.locale.cite, en.cite)
	},
	rendersInTheLocale: () => {
		// its problem reads what the data was, though en's leaves it out
		strictEqual(type("string")(5).toString(), "<string>! (5)")
		strictEqual(type({ k: "string" })({ k: 5 }).toString(), "k <string>! (5)")
	},
	describesInEnglish: () => {
		strictEqual(type("string").description, "a string")
	}
})
