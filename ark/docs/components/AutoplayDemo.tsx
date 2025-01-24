export type AutoplayDemoProps = React.DetailedHTMLProps<
	React.VideoHTMLAttributes<HTMLVideoElement>,
	HTMLVideoElement
> & { src: string }
export const AutoplayDemo = (props: AutoplayDemoProps) => (
	<div style={{ opacity: 0.8 }}>
		<video
			autoPlay
			loop
			controls={true}
			playsInline
			muted
			disablePictureInPicture={true}
			{...props}
		/>
		<p style={{ fontSize: "1rem" }}>
			Type-level feedback on keystroke-{" "}
			<b>no plugins or build steps required</b>.
		</p>
	</div>
)
