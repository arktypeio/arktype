import { registerHooks } from "node:module"

// a world built for errors "none" runs on issuesNone.ts, as the published
// runtime is bundled, swapped before the worker's own imports load issues.ts
registerHooks({
	resolve: (specifier, context, next) => {
		const resolved = next(specifier, context)
		return resolved.url.endsWith("/ark/schema/shared/issues.ts") ?
				{
					...resolved,
					url: resolved.url.replace(/issues\.ts$/, "issuesNone.ts")
				}
			:	resolved
	}
})
