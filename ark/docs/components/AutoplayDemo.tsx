export type AutoplayDemoProps = React.DetailedHTMLProps<
	React.VideoHTMLAttributes<HTMLVideoElement>,
	HTMLVideoElement
> & { src: string }

export const MainAutoplayDemo = () => (
	<AutoplayDemo src="https://github.com/user-attachments/assets/eaace5f0-310e-4fc8-9a95-1c0afc6fd110" />
)

export const AutoplayDemo = (props: AutoplayDemoProps) => (
	<div>
		<video
			autoPlay
			loop
			controls={true}
			playsInline
			muted
			disablePictureInPicture={true}
			{...props}
		/>
		<p>
			Type-level feedback on keystroke-{" "}
			<b>no plugins or build steps required</b>.
		</p>
	</div>
)
