"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export const ClientRedirect = ({ to }: { to: string }) => {
	const router = useRouter()
	useEffect(
		() => router.replace(to + location.search + location.hash),
		[router, to]
	)
	return null
}
