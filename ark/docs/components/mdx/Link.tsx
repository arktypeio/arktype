import NextLink from "next/link"
import type { ComponentProps } from "react"

/**
 * MDX's `a`: site links navigate client-side, others open in a new tab.
 * Links to the generated Markdown and llms.txt files are plain, since they
 * aren't pages.
 */
export const Link = ({
	href = "",
	children,
	...props
}: ComponentProps<"a">) => {
	if (href.startsWith("#")) {
		return (
			<a href={href} {...props}>
				{children}
			</a>
		)
	}

	if (href.startsWith("/") && !/\.(md|txt|json)(#|$)/.test(href)) {
		return (
			<NextLink href={href} prefetch={false} {...(props as {})}>
				{children}
			</NextLink>
		)
	}

	const external =
		/^https?:\/\//.test(href) && !href.startsWith("https://arktype.io/")
	return (
		<a
			href={href}
			{...(external && {
				target: "_blank",
				rel: "noreferrer",
				"data-external": ""
			})}
			{...props}
		>
			{children}
		</a>
	)
}
