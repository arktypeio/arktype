import { cn } from "fumadocs-ui/components/api"
import { CheckIcon, LinkIcon } from "lucide-react"
import { useState } from "react"
import { copyToClipboard } from "./utils.ts"

export interface ShareLinkProps {
	onShare: () => string
	className?: string
}

export const ShareLink = ({ onShare, className }: ShareLinkProps) => {
	const [copied, setCopied] = useState(false)

	const handleClick = async () => {
		const url = onShare()
		const success = await copyToClipboard(url)

		if (success) {
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		}
	}

	return (
		<button
			className={cn(
				"absolute top-4 right-4 p-2 rounded-lg cursor-pointer",
				"bg-blue-900/50 hover:bg-blue-900 transition-colors",
				"text-white/70 hover:text-white",
				"backdrop-blur-sm",
				className
			)}
			onClick={handleClick}
			title="Copy shareable link"
		>
			{copied ?
				<CheckIcon size={16} />
			:	<LinkIcon size={16} />}
		</button>
	)
}
