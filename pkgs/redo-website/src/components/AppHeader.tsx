import React, { FC } from "react"
import { Text, Column } from "redo-components"
import { AnimatedLogo } from "./AnimatedLogo"
import Typist from "react-typist"

export const AppHeader: FC = () => {
    return (
        <Column>
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
    )
}
