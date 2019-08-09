import React, { useEffect, createRef, useContext } from "react"
import { Card, useTheme } from "redo-components"

export const Background = () => {
    const theme = useTheme()
    return (
        <div
            style={{
                background: theme.palette.background.paper
            }}
        >
            <Card
                elevation={24}
                style={{
                    position: "absolute",
                    width: "100%",
                    top: -theme.spacing(100),
                    height: theme.spacing(134),
                    transform: "skewY(-6deg)",
                    transformOrigin: "left"
                }}
            />
        </div>
    )
}
