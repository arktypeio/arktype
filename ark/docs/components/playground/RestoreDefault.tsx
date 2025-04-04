import { cn } from "fumadocs-ui/components/api"
import { RotateCcwIcon } from "lucide-react"

export interface RestoreDefaultProps {
	onClick: () => void
	variant?: "full" | "icon"
	className?: string
}

export const RestoreDefault = ({
	onClick,
	variant = "full",
	className
}: RestoreDefaultProps) => {
	if (variant === "icon") {
		return (
			<button
				className={cn(
					"absolute top-4 right-4 p-2 rounded-lg",
					"bg-blue-900/50 hover:bg-blue-900 transition-colors",
					"text-white/70 hover:text-white",
					"backdrop-blur-sm",
					className
				)}
				onClick={onClick}
				title="Restore Default Code"
			>
				<RotateCcwIcon size={16} />
			</button>
		)
	}

	return (
		<button
			className={cn(
				"mt-4 px-4 py-2 bg-blue-900 text-white rounded",
				"hover:bg-blue-950 transition-colors",
				"flex items-center gap-2",
				className
			)}
			onClick={onClick}
		>
			<RotateCcwIcon size={16} />
			Restore Default Code
		</button>
	)
}
