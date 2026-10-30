import { CheckIcon, CopyIcon } from "./icons.tsx"

/** the gold install button; HomeEffects copies `data-copy` on click */
export const InstallButton = () => (
	<button type="button" className="btn btn-gold" data-copy="npm i arktype">
		<span className="visually-hidden">Copy install command: </span>
		<span className="swap">
			<span className="idle">
				npm i arktype <CopyIcon />
			</span>
			<span className="done" aria-hidden>
				copied <CheckIcon />
			</span>
		</span>
		<span className="visually-hidden" role="status" />
	</button>
)

export type CopyCommandProps = {
	/** what's shown */
	children: React.ReactNode
	/** what's copied */
	text: string
	/** what it copies, for screen readers, which read it before what's shown */
	label: string
}

export const CopyCommand = ({ children, text, label }: CopyCommandProps) => (
	<button type="button" className="cmd" data-copy={text}>
		<span className="visually-hidden">{label}: </span>
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
		<span className="visually-hidden" role="status" />
	</button>
)
