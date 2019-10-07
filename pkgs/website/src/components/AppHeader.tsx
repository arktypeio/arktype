import React from "react"
import Typist from "react-typist"
import { Link } from "react-router-dom"
import {
    Text,
    Column,
    AnimatedLogo,
    Row,
    IconButton,
    Icons
} from "@re-do/components"
import { Background } from "./Background"
import { layout } from "../constants"

export type AppHeaderProps = {
    mobile?: boolean
}

export const AppHeader = ({ mobile }: AppHeaderProps) => {
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
                <Row justify="space-around">
                    <Link to="/">
                        <IconButton color="primary" Icon={Icons.home} />
                    </Link>
                    <Link to="/blog">
                        <IconButton color="primary" Icon={Icons.blog} />
                    </Link>
                </Row>
            </Column>
        </Column>
    )
}
