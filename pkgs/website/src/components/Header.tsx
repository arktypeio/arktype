import React, { useEffect, useState } from "react"
import Typist from "react-typist"
import { Text, Column, AnimatedLogo, Row, Card } from "@re-do/components"
import { ScrollingGetStartedButton } from "./ScrollingGetStartedButton"
import { layout } from "./constants"

export const Header = () => {
    const [width, setWidth] = useState(window.innerWidth)
    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth)
        window.addEventListener("resize", handleResize)
        return () => {
            window.removeEventListener("resize", handleResize)
        }
    })
    const angle = -Math.tan(50 / width)
    return (
        <>
            <Card
                elevation={24}
                style={{
                    position: "fixed",
                    top: -24,
                    zIndex: 1,
                    transform: `skewY(${angle}rad)`,
                    transformOrigin: "center",
                    width,
                    display: "flex",
                    justifyContent: "center"
                }}
            >
                <AnimatedLogo
                    style={{
                        marginTop: 24,
                        transform: `skewY(${-angle}rad)`,
                        height: layout.headerHeight
                    }}
                />
            </Card>
            <Card
                elevation={24}
                style={{
                    width,
                    marginTop: 96,
                    padding: 16,
                    transform: `skewY(${angle}rad)`,
                    transformOrigin: "center",
                    background: "#2979ff",
                    display: "flex",
                    justifyContent: "center"
                }}
            >
                <Column
                    align="center"
                    width={400}
                    style={{
                        minHeight: layout.headerHeight,
                        transform: `skewY(${-angle}rad)`
                    }}
                >
                    <Text variant="h4" style={{ color: "white" }}>
                        Web testing rewritten
                    </Text>
                    <Typist
                        startDelay={400}
                        avgTypingDelay={80}
                        cursor={{ show: false }}
                    >
                        <Text variant="h4" color="secondary">
                            is writing itself.
                        </Text>
                    </Typist>
                </Column>
            </Card>
            <ScrollingGetStartedButton />
        </>
    )
}
