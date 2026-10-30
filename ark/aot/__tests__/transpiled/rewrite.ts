import { registerHooks } from "node:module"

registerHooks({
	load: (url, context, nextLoad) => {
		const loaded = nextLoad(url, context)
		return url.endsWith("/mode.ts") ?
				{ ...loaded, source: String(loaded.source).replace("delete", "ignore") }
			:	loaded
	}
})
