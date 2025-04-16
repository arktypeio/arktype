"use client"

import { cx } from "class-variance-authority"
import { Star } from "lucide-react"
import React, { useEffect, useState } from "react"
import { Button } from "./Button.tsx"

export declare namespace GhStarButton {
	export type Props = {
		className?: string
	}
}

// based on the trpc component:
// https://github.com/trpc/trpc/blob/7d10d7b028f1d85f6523e995ee7deb17dc886874/www/src/components/GithubStarsButton.tsx#L15
export const GhStarButton = ({ className }: GhStarButton.Props) => {
	const [starCount, setStarCount] = useState<string>("5.8k")

	const formatStarCount = (count: number): string => {
		if (count < 1000) return count.toString()

		const roundedCount = Math.floor(count / 100) / 10
		const roundUpCount = Math.ceil(count / 100) / 10
		const finalCount = count % 100 >= 50 ? roundUpCount : roundedCount

		return `${finalCount}k`
	}

	const fetchStars = async () => {
		const res = await fetch("https://api.github.com/repos/arktypeio/arktype")
		const data = (await res.json()) as { stargazers_count: number }
		if (typeof data?.stargazers_count === "number")
			setStarCount(formatStarCount(data.stargazers_count))
	}

	useEffect(() => {
		fetchStars().catch(console.error)
	}, [])

	return (
		<Button
			variant="outline"
			href="https://github.com/arktypeio/arktype"
			linkTarget="_blank"
			size="lg"
			className={cx(className)}
		>
			{starCount}
			<Star size={16} />
		</Button>
	)
}
