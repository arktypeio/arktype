import { cn } from "fumadocs-ui/components/api"
import { Card, type CardProps, Cards } from "fumadocs-ui/components/card"

const cardColors = [
	"#9558f8",
	"#ee5389",
	"#1285d2",
	"#e66d41",
	"#10b981",
	"#eebd53"
]

const cardStyle = cardColors
	.map(
		(color, i) =>
			`.ark-card:nth-child(${cardColors.length}n + ${i + 1}) {
		border-color: ${color}88;
		border-radius: 1.5rem;
}
	
.ark-card:nth-child(${cardColors.length}n + ${i + 1}) > div:first-child {
		color: white;
		background-color: ${color}50;
		border-color: ${color};
		border-width: 2px;
	}`
	)
	.join("\n")

export const ArkCards: React.FC<{ children: React.ReactNode }> = ({
	children
}) => (
	<>
		<style>{cardStyle}</style>
		<Cards className="ark-cards">{children}</Cards>
	</>
)

export const ArkCard: React.FC<CardProps> = ({
	children,
	className,
	...props
}) => (
	<Card
		{...props}
		className={cn(
			"ark-card",
			"shadow-[0_0_3px_rgba(255,255,255,0.7),_0_1px_2px_rgba(0,0,0,0.1),_inset_0_0_4px_rgba(255,255,255,0.1)]",
			"sm:even:translate-y-10 [&>h3]:text-2xl [&>h3]:font-semibold [&_.prose-no-margin]:text-lg",
			"[&>.prose-no-margin]:flex [&>.prose-no-margin]:flex-col [&>.prose-no-margin]:flex-grow",
			"flex flex-col",
			className
		)}
	>
		{children}
	</Card>
)
