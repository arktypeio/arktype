import React from "react"

export type AutoplayDemoProps = React.DetailedHTMLProps<
	React.VideoHTMLAttributes<HTMLVideoElement>,
	HTMLVideoElement
> & { src: string }

// Note: not currently used, but copied over in case it's needed

export const AutoplayDemo = (props: AutoplayDemoProps) => (
	<video
		autoPlay
		loop
		controls={true}
		// required for autoplay on Safari
		playsInline
		// there's no audio, but required for autoplay on Chrome
		muted
		// picture in picture doesn't work well since the page is designed around the demo
		disablePictureInPicture={true}
		{...props}
	/>
)
