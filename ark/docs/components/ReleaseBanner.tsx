"use client"

import { usePathname } from "next/navigation"
import { Banner } from "./Banner.tsx"

const text = "🎉 Announcing ArkType 2.0 🎉"

export const ReleaseBanner = () => (
	<Banner style={{ fontSize: 16 }} boat={usePathname().includes("docs")}>
		{text}
	</Banner>
)
