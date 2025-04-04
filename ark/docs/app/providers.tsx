"use client"

import posthog from "posthog-js"
import { PostHogProvider } from "posthog-js/react"

if (
	globalThis.window !== undefined &&
	process.env.NEXT_PUBLIC_POSTHOG_KEY &&
	process.env.NEXT_PUBLIC_POSTHOG_HOST
) {
	posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
		api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
		person_profiles: "always"
	})
}

export const CSPostHogProvider = ({
	children
}: {
	children: React.ReactNode
}) => <PostHogProvider client={posthog}>{children}</PostHogProvider>
