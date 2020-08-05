import React from "react"
import Typist from "react-typist"
import { Text, Column, Card } from "@re-do/components"
import { layout } from "../constants"

export type SubHeaderProps = {
    skewAngle: number
    mobile: boolean
}

export const SubHeader = ({ skewAngle, mobile }: SubHeaderProps) => {
    const skew = `skewY(${skewAngle}rad)`
    const unskew = `skewY(${-skewAngle}rad)`
    return (
        <Card
            elevation={24}
            style={{
                marginTop: 96,
                paddingTop: 32,
                width: "100%",
                transform: skew,
                transformOrigin: "center",
                background: "#2979ff"
            }}
        >
            <Column
                align="center"
                style={{ minHeight: layout.header.height, transform: unskew }}
            >
                <Text
                    variant="h4"
                    style={{
                        color: "white"
                    }}
                >
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
    )
}
