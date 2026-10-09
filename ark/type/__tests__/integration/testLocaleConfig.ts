import { locale } from "./localeConfig.ts"

import { $ark } from "@ark/schema"
import { type } from "arktype"
import { en } from "arktype/locales/en"
import { strictEqual, throws } from "node:assert/strict"
import { cases } from "./util.ts"

cases({
	resolvedFromTheConfigAsOfImport: () => {
		strictEqual($ark.resolvedConfig.locale.tag, locale.tag)
		strictEqual($ark.resolvedConfig.locale.cite, en.cite)
	},
	rendersInTheLocale: () => {
		strictEqual(type("string")(5).toString(), "<string>! (5)")
		strictEqual(type({ k: "string" })({ k: 5 }).toString(), "k <string>! (5)")
	},
	rendersWhatItLacksThroughEn: () => {
		strictEqual(type("number > 0")(0).toString(), "must be positive (was 0)")
		strictEqual(type("string.email")("x").toString(), 'an email address! ("x")')
	},
	describesInEnglish: () => {
		strictEqual(type("string").description, "a string")
	},
	rendersInEnglishOnRequest: () => {
		strictEqual(
			type("string")(5).toLocaleString(en),
			"must be a string (was a number)"
		)
	},
	defaultValueParseErrorsAreEnglish: () => {
		throws(
			() => type({ k: ["number", "=", () => "x"] } as never),
			/^ParseError: Default for k must be a number \(was a string\)$/
		)
	}
})
