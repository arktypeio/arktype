import React, { useEffect, useState } from "react"
import Typist from "react-typist"
import { Text, Column, Card } from "@re-do/components"
import { layout } from "../constants"

export type SubHeaderProps = {
    skewAngle: number
}

export const SubHeader = ({ skewAngle }: SubHeaderProps) => {
    return (
        <Card
            elevation={24}
            style={{
                marginTop: 96,
                padding: 16,
                width: "100%",
                transform: `skewY(${skewAngle}rad)`,
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
                    minHeight: layout.header.height,
                    transform: `skewY(${-skewAngle}rad)`
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
    )
}
