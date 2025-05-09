import { cn } from "fumadocs-ui/components/api"
import { Card } from "fumadocs-ui/components/card"
import { ArrowRight } from "lucide-react"
import Link from "next/link.js"

export const LinkCard: React.FC<{
	href: string
	description: string
	title: string
	className?: string
	date?: string
}> = ({ href, description, title, className, date }) => (
	<Link href={href} className={cn("block relative", className)}>
		<Card
			title={title}
			className="border-[#003b62] hover:border-white [&>h3]:text-xl [&>h3]:font-semibold hover:bg-blue-500/10 group"
		>
			<ArrowRight className="right-4 absolute top-3 group-hover:text-white" />
			<p className="text-lg">{description}</p>
			{date && (
				<span className="absolute right-4 bottom-3 text-sm text-gray-500">
					{date}
				</span>
			)}
		</Card>
	</Link>
)
