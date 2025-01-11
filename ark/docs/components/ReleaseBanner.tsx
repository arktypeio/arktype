"use client"

import { usePathname } from "next/navigation"
import { Banner } from "./Banner.tsx"

const text = "🎉 ArkType 2.0 Released 🎉"

export const ReleaseBanner = () => (
	<Banner boat={usePathname().includes("docs")}>{text}</Banner>
)
