"use client"

import { usePathname } from "next/navigation.js"
import { Banner } from "./Banner.tsx"

const text = "🎉 Introducing arkregex 🎉"

export const ReleaseBanner = () => (
	<Banner
		id="arkregex"
		href="/docs/blog/arkregex"
		style={{ fontSize: 16 }}
		boat={usePathname().includes("docs")}
	>
		{text}
	</Banner>
)
