import React, { FC, CSSProperties } from "react"
import { Text, Column, useTheme, Row } from "redo-components"
import { AnimatedLogo } from "./AnimatedLogo"
import { Background } from "./Background"
import Typist from "react-typist"

export type AppHeaderProps = {
    mobile?: boolean
}

export const AppHeader: FC<AppHeaderProps> = ({ mobile }) => {
    const theme = useTheme()
    return (
        <>
            <Background skewBetween={mobile ? [300, 225] : [400, 200]} />
            <Column style={{ padding: theme.spacing(2) }} height={300}>
                <AnimatedLogo style={{ maxWidth: "50%" }} />
                <Text variant="h5" color="primary">
                    Automated testing
                </Text>
                <Typist startDelay={400} cursor={{ show: false }}>
                    <Text variant="h5" color="secondary">
                        that builds itself.
                    </Text>
                </Typist>
            </Column>
        </>
    )
}
