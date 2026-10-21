import { CheckIcon, CopyIcon } from "./icons.tsx"

/** the gold install button; HomeEffects copies `data-copy` on click */
export const InstallButton = () => (
	<button
		type="button"
		className="btn btn-gold"
		data-copy="npm i arktype"
		aria-label="Copy install command"
	>
		<span className="swap">
			<span className="idle">
				npm i arktype <CopyIcon />
			</span>
			<span className="done">
				copied <CheckIcon />
			</span>
		</span>
		<span className="sr-only" role="status" />
	</button>
)

export type CopyCommandProps = {
	/** what's shown */
	children: React.ReactNode
	/** what's copied */
	text: string
	label: string
}

export const CopyCommand = ({ children, text, label }: CopyCommandProps) => (
	<button type="button" className="cmd" data-copy={text} aria-label={label}>
		<span>{children}</span>
		<span className="cp">
			<span className="swap">
				<span className="idle">
					<CopyIcon />
				</span>
				<span className="done">
					<CheckIcon />
				</span>
			</span>
		</span>
		<span className="sr-only" role="status" />
	</button>
)
