import { configure } from "arktype/config"
import "arktype/i18n"

// untyped, so it renders what it lacks through en
export const locale = {
	tag: "test",
	domain: { expected: (e: { domain: string }) => `<${e.domain}>` },
	problem: (e: { expected: string; actual: string }) =>
		`${e.expected}! (${e.actual})`
}

configure({ locale: locale as never })
