import { configure } from "arktype/config"

configure({
	keywords: { "string.uuid": "an id" },
	domain: { message: ctx => `${ctx.propString} is ${ctx.actual}` },
	onFail: errors => `failed: ${errors.summary}`
})
