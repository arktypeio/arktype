import React from "react"
import { AnimatedLogo, Card } from "@re-do/components"
import { layout } from "../constants"

export type HeaderTitleProps = {
    skewAngle: number
}

export const HeaderTitle = ({ skewAngle }: HeaderTitleProps) => {
    return (
        <Card
            elevation={24}
            style={{
                position: "fixed",
                top: -24,
                zIndex: 1,
                width: "100%",
                transform: `skewY(${skewAngle}rad)`,
                transformOrigin: "center",
                display: "flex",
                justifyContent: "center"
            }}
        >
            <AnimatedLogo
                style={{
                    marginTop: 24,
                    transform: `skewY(${-skewAngle}rad)`,
                    height: layout.header.height
                }}
            />
        </Card>
    )
}
