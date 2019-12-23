import React, { CSSProperties } from "react"

export type AppContentsProps = {
    style?: CSSProperties
    children: JSX.Element
}

export const AppContents = ({ style, children }: AppContentsProps) => (
    <div
        style={{
            height: "100vh",
            width: "calc(100vw - (100vw - 100%))",
            ...style
        }}
    >
        {children}
    </div>
)
