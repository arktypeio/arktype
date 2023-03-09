import React from "react"

export type AutoplayDemoProps = React.DetailedHTMLProps<
    React.VideoHTMLAttributes<HTMLVideoElement>,
    HTMLVideoElement
> & { src: string }

export const AutoplayDemo = (props: AutoplayDemoProps) => (
    <video
        autoPlay
        loop
        controls={true}
        // required for autoplay on Safari
        playsinline
        // there's no audio, but required for autoplay on Chrome
        muted
        // picture in picture doesn't work well since the page is designed around the demo
        disablePictureInPicture={true}
        {...props}
    />
)
