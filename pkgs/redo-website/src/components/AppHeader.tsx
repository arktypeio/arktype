import React, { FC } from "react"
import { Text, Column, useTheme } from "redo-components"
import { AnimatedLogo } from "./AnimatedLogo"
import { Background } from "./Background"
import Typist from "react-typist"
import { layout } from "../constants"

export type AppHeaderProps = {
    mobile?: boolean
}

export const AppHeader: FC<AppHeaderProps> = ({ mobile }) => {
    const startHeight = mobile ? layout.header.height : 400
    const endHeight = mobile ? 200 : 200
    return (
        <Column
            align="center"
            height={startHeight}
            style={{ position: "fixed", zIndex: 1 }}
        >
            <Background skewBetween={[startHeight, endHeight]} />
            <Column
                style={{
                    zIndex: 1,
                    ...layout.content
                }}
                justify="space-around"
                align="center"
            >
                <AnimatedLogo style={{ width: 300 }} />
                <Text variant="h4" color="primary">
                    Automated testing
                </Text>
                <Typist startDelay={400} cursor={{ show: false }}>
                    <Text variant="h4" color="secondary">
                        that builds itself.
                    </Text>
                </Typist>
            </Column>
        </Column>
    )
}
