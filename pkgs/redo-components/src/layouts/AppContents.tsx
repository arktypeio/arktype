import React, { FC } from "react"

export const AppContents: FC = ({ children }) => {
    return (
        <div
            style={{
                height: "100vh",
                width: "calc(100vw - (100vw - 100%))"
            }}
        >
            {children}
        </div>
    )
}
