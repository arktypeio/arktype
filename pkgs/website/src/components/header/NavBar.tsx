import React from "react"
import Link from "@docusaurus/Link"
import { AnimatedLogo, Card, Row, Text } from "@re-do/components"
import { layout } from "../constants"

export type NavBarProps = {
    skewAngle: number
}

export const NavBar = ({ skewAngle }: NavBarProps) => {
    return (
        <Card
            elevation={24}
            style={{
                position: "fixed",
                top: -24,
                zIndex: 1,
                width: "100%",
                transform: `skewY(${skewAngle}rad)`,
                transformOrigin: "center",
                display: "flex",
                justifyContent: "center"
            }}
        >
            <Row
                justify="space-between"
                style={{
                    maxWidth: layout.maxWidth,
                    marginTop: 24,
                    transform: `skewY(${-skewAngle}rad)`,
                    paddingLeft: 24,
                    paddingRight: 24
                }}
            >
                <div style={{ width: 100, display: "inline-flex" }}>
                    <Text style={{ paddingRight: 16 }}>
                        <a href="https://github.com/re-do/redo" target="_blank">
                            GitHub
                        </a>
                    </Text>
                    <Text>
                        <Link to="/blog">Blog</Link>
                    </Text>
                </div>
                <AnimatedLogo
                    style={{
                        flexGrow: 1,
                        maxHeight: layout.header.height
                    }}
                />
                <div style={{ width: 100 }} />
            </Row>
        </Card>
    )
}
