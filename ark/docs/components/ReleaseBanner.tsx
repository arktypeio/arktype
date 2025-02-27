"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Banner } from "./Banner.tsx"

const text = "📈 Announcing ArkType 2.1 📈"

export const ReleaseBanner = () => (
	<Link href="/docs/blog/2.1">
		<Banner
			id="2.1"
			style={{ fontSize: 16 }}
			boat={usePathname().includes("docs")}
		>
			{text}
		</Banner>
	</Link>
)
