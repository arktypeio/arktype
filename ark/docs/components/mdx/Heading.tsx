import type { ComponentProps } from "react"
import { ApiSignature } from "./ApiMembers.tsx"

type HeadingProps = ComponentProps<"h2"> & {
	as: "h2" | "h3" | "h4" | "h5" | "h6"
	/** set by lib/content/expand.ts on an API member's heading */
	"data-api-member"?: string
	"data-params"?: string
}

/** a heading with a link to itself; ids come from lib/content/headings.ts */
export const Heading = ({
	as: Tag,
	id,
	children,
	"data-api-member": apiMember,
	"data-params": params,
	...props
}: HeadingProps) =>
	apiMember ?
		<Tag id={id} className="api-title" {...props}>
			<a href={`#${id}`}>
				<ApiSignature name={apiMember} params={params} />
			</a>
		</Tag>
	:	<Tag id={id} {...props}>
			{id && (
				<a href={`#${id}`} className="anchor" aria-hidden tabIndex={-1}>
					#
				</a>
			)}
			{children}
		</Tag>
