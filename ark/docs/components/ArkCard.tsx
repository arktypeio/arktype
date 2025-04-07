import { cn } from "fumadocs-ui/components/api"
import { Card, type CardProps, Cards } from "fumadocs-ui/components/card"

export const ArkCards: React.FC<{ children: React.ReactNode }> = ({
	children
}) => <Cards>{children}</Cards>

export const ArkCard: React.FC<CardProps> = ({
	children,
	className,
	...props
}) => (
	<Card
		{...props}
		className={cn(
			"sm:even:translate-y-10 [&>h3]:text-2xl [&>h3]:font-semibold [&_.prose-no-margin]:text-lg",
			"[&>.prose-no-margin]:flex [&>.prose-no-margin]:flex-col [&>.prose-no-margin]:flex-grow",
			"flex flex-col",
			"rounded-3xl",
			className
		)}
		style={{
			borderWidth: 2
		}}
	>
		{children}
	</Card>
)
