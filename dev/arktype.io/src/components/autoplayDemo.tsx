import React from "react"

export type AutoplayDemoProps = React.DetailedHTMLProps<
    React.VideoHTMLAttributes<HTMLVideoElement>,
    HTMLVideoElement
> & { src: string }

export const AutoplayDemo = (props: AutoplayDemoProps) => (
    <video
        autoPlay
        loop
        muted
        disablePictureInPicture={true}
        controls={true}
        {...props}
    />
)
