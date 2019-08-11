import React, { FC } from "react"
import { Text, Column, useTheme } from "redo-components"
import { AnimatedLogo } from "./AnimatedLogo"
import { Background } from "./Background"
import { copy } from "./Copy"
import Typist from "react-typist"

export type AppHeaderProps = {
    mobile?: boolean
}

export const AppHeader: FC<AppHeaderProps> = ({ mobile }) => {
    const startHeight = mobile ? 250 : 400
    const endHeight = mobile ? 200 : 200
    return (
        <Column align="center" height={startHeight}>
            <Background skewBetween={[startHeight, endHeight]} />
            <Column
                style={{
                    zIndex: 1,
                    padding: useTheme().spacing(2),
                    maxWidth: 500
                }}
                justify="space-around"
                width="fit-content"
                align="center"
            >
                <AnimatedLogo />
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
