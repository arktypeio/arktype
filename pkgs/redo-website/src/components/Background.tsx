import React, { useEffect, useState, FC } from "react"
import { Card } from "redo-components"

export type BackgroundProps = {
    skewBetween: [number, number]
}

export const Background: FC<BackgroundProps> = ({ skewBetween }) => {
    const [width, setWidth] = useState(window.innerWidth)
    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth)
        window.addEventListener("resize", handleResize)
        return () => {
            window.removeEventListener("resize", handleResize)
        }
    })
    const skewAngle = Math.tan((skewBetween[1] - skewBetween[0]) / width)
    return (
        <Card
            elevation={24}
            style={{
                position: "absolute",
                width,
                height: skewBetween[0] + 24,
                top: -24,
                transform: `skewY(${skewAngle}rad)`,
                transformOrigin: "left"
            }}
        />
    )
}
