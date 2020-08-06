import React from "react"
import Typist from "react-typist"
import { Text, Column, Card } from "@re-do/components"
import { layout } from "../constants"
import { motion, useViewportScroll } from "framer-motion"

export type SubHeaderProps = {
    skewAngle: number
    mobile: boolean
}

export const SubHeader = ({ skewAngle, mobile }: SubHeaderProps) => {
    const { scrollY } = useViewportScroll()
    const skew = `skewY(${skewAngle}rad)`
    const unskew = `skewY(${-skewAngle}rad)`
    return (
        <>
            <Card
                elevation={24}
                style={{
                    position: mobile ? "fixed" : "unset",
                    marginTop: layout.header.height,
                    width: "100%",
                    transform: skew,
                    transformOrigin: "center",
                    background: "#2979ff",
                    zIndex: 1
                }}
            >
                <Column
                    align="center"
                    style={{
                        position: "revert",
                        paddingTop: layout.header.slantHeight / 2,
                        minHeight: layout.header.height + 8,
                        transform: unskew
                    }}
                >
                    <motion.div
                        style={{ position: "relative", bottom: scrollY }}
                    >
                        <Text
                            variant="h4"
                            style={{
                                color: "white"
                            }}
                            align="center"
                        >
                            Web testing rewritten
                        </Text>
                        <Typist
                            startDelay={400}
                            avgTypingDelay={80}
                            cursor={{ show: false }}
                        >
                            <Text variant="h4" color="secondary" align="center">
                                is writing itself.
                            </Text>
                        </Typist>
                    </motion.div>
                </Column>
            </Card>
            {mobile ? (
                <div
                    style={{
                        height:
                            layout.header.height * 2 + layout.header.slantHeight
                    }}
                />
            ) : null}
        </>
    )
}
