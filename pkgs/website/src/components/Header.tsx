import React, { useEffect, useState } from "react"
import Typist from "react-typist"
import { Text, Column, AnimatedLogo, Row, Card } from "@re-do/components"
import { GetStartedButton } from "."

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
                    width
                }}
            >
                <Row
                    justify="center"
                    style={{ transform: `skewY(${-angle}rad)`, marginTop: 24 }}
                >
                    <AnimatedLogo
                        style={{
                            height: 80
                        }}
                    />
                </Row>
            </Card>
            <Card
                elevation={24}
                style={{
                    width,
                    marginTop: 96,
                    padding: 16,
                    transform: `skewY(${angle}rad)`,
                    transformOrigin: "center",
                    background: "#2979ff"
                }}
            >
                <Row
                    justify="center"
                    align="center"
                    style={{
                        transform: `skewY(${-angle}rad)`
                    }}
                >
                    <div style={{ minWidth: 160 }} />
                    <Column
                        align="center"
                        width={400}
                        style={{ minHeight: 84 }}
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
                    <div style={{ minWidth: 160 }}>
                        <GetStartedButton />
                    </div>
                </Row>
            </Card>
        </>
    )
}
