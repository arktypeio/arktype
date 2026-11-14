"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { hashRedirectTarget } from "../../lib/content/redirects.ts"

/** follows links to sections that moved to another page */
export const HashRedirect = () => {
	const router = useRouter()
	const pathname = usePathname()

	useEffect(() => {
		const follow = () => {
			const target = hashRedirectTarget(location.pathname, location.hash)
			if (target) router.replace(target)
		}
		follow()
		addEventListener("hashchange", follow)
		return () => removeEventListener("hashchange", follow)
	}, [router, pathname])

	return null
}
