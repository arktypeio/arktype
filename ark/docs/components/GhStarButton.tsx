import { cx } from "class-variance-authority"
import { Star } from "lucide-react"
import { Button } from "./Button.tsx"

export declare namespace GhStarButton {
	export type Props = {
		className?: string
	}
}

export const formatStarCount = (count: number): string => {
	if (count < 1000) return count.toString()

	const roundedCount = Math.floor(count / 100) / 10
	const roundUpCount = Math.ceil(count / 100) / 10
	const finalCount = count % 100 >= 50 ? roundUpCount : roundedCount

	return `${finalCount}k`
}

// The docs are statically exported, so this runs once per build. That keeps
// the number correct on first paint (no hardcoded fallback that jumps after
// hydration) and costs one unauthenticated request per build instead of one
// per visitor, well within GitHub's rate limit. GITHUB_TOKEN is used if
// present (e.g. in CI) for a higher limit.
export const fetchStars = async (): Promise<string | undefined> => {
	try {
		const token = process.env.GITHUB_TOKEN
		const res = await fetch("https://api.github.com/repos/arktypeio/arktype", {
			headers: token ? { Authorization: `Bearer ${token}` } : {}
		})
		if (!res.ok) return
		const data = (await res.json()) as { stargazers_count?: unknown }
		if (typeof data.stargazers_count === "number")
			return formatStarCount(data.stargazers_count)
	} catch (e) {
		console.error("Failed to fetch GitHub star count:", e)
	}
}

// based on the trpc component:
// https://github.com/trpc/trpc/blob/7d10d7b028f1d85f6523e995ee7deb17dc886874/www/src/components/GithubStarsButton.tsx#L15
export const GhStarButton = async ({ className }: GhStarButton.Props) => {
	// if the fetch fails, render the star alone rather than a stale number
	const starCount = await fetchStars()

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
