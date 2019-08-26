import React, { FC, CSSProperties } from "react"

export type AppContentsProps = {
    style?: CSSProperties
}

export const AppContents: FC<AppContentsProps> = ({ style, children }) => {
    return (
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
}
