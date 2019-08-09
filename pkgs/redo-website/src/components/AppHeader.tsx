import React, { FC, CSSProperties } from "react"
import { Text, Column, Row, HideFor } from "redo-components"
import { AnimatedLogo } from "./AnimatedLogo"
import Typist from "react-typist"

export type AppHeaderProps = {}

export const AppHeader: FC<AppHeaderProps> = ({}) => {
    return (
        <Column style={{ height: 300 }}>
            <AnimatedLogo style={{ maxWidth: 400 }} />
            <Text variant="h3" color="primary">
                Automated testing
            </Text>
            <Typist startDelay={400} cursor={{ show: false }}>
                <Text variant="h3" color="secondary">
                    that builds itself.
                </Text>
            </Typist>
        </Column>
    )
}
