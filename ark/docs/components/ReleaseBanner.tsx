"use client"

import { usePathname } from "next/navigation.js"
import { Banner } from "./Banner.tsx"

const text = "📈 Announcing ArkType 2.1 📈"

export const ReleaseBanner = () => (
	<Banner
		id="2.1"
		href="/docs/blog/2.1"
		style={{ fontSize: 16 }}
		boat={usePathname().includes("docs")}
	>
		{text}
	</Banner>
)
