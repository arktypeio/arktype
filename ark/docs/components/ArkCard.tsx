import { cn } from "fumadocs-ui/components/api"
import { Card, type CardProps, Cards } from "fumadocs-ui/components/card"

const COOL_COLORS = [
	"#ab25e9", // purple
	"#ee5389", // red
	"#eebd53", // orange
	"#84ee53", // green
	"#3347ff" // blue
]

const coolColorStyle = COOL_COLORS.map(
	(color, i) =>
		`.ark-card:nth-child(${COOL_COLORS.length - 1}n + ${i}) > div:first-child {
        color: white;
        background-color: ${color}50;
        border-color: ${color};
        border-width: 2px;
    }`
).join("\n")

export const ArkCards: React.FC<{ children: React.ReactNode }> = ({
	children
}) => (
	<>
		<style>{coolColorStyle}</style>
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
			"ark-card", // special class for ArkCards targeting
			"sm:even:translate-y-10 [&>h3]:text-2xl [&>h3]:font-semibold [&_.prose-no-margin]:text-lg border-[#003b62]",
			"[&>.prose-no-margin]:flex [&>.prose-no-margin]:flex-col [&>.prose-no-margin]:flex-grow",
			"flex flex-col",
			className
		)}
	>
		{children}
	</Card>
)
