"use client"

import { useEffect } from "react"

/**
 * Starts PostHog once the page is idle. Nothing reads it from React, so it
 * loads as its own chunk instead of with every page's JS.
 */
export const Analytics = () => {
	useEffect(() => {
		const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
		const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
		if (!key || !host) return
		const start = () =>
			import("posthog-js").then(({ default: posthog }) =>
				posthog.init(key, { api_host: host, person_profiles: "always" })
			)
		if ("requestIdleCallback" in window) requestIdleCallback(start)
		else setTimeout(start, 2000)
	}, [])
	return null
}
