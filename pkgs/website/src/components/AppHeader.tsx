import React from "react"
import Typist from "react-typist"
import { Text, Column, AnimatedLogo, Row, Link } from "@re-do/components"
import { Background } from "./Background"
import { layout } from "../constants"

export type AppHeaderProps = {
    mobile?: boolean
}

export const AppHeader = ({ mobile }: AppHeaderProps) => {
    const startHeight = layout.header.contentHeight + layout.header.slantHeight
    const endHeight = layout.header.contentHeight
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
                <Row justify="space-around">
                    <Link to="/" variant="h6">
                        Home
                    </Link>
                    <Link to="/blog" variant="h6">
                        Blog
                    </Link>
                </Row>
            </Column>
        </Column>
    )
}
