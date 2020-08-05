import React from "react"
import Link from "@docusaurus/Link"
import { AnimatedLogo, Card, Row, Text } from "@re-do/components"
import { layout } from "../constants"
import { NavBarLink } from "./NavBarLink"

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
            <AnimatedLogo
                style={{
                    marginTop: 24,
                    transform: `skewY(${-skewAngle}rad)`,
                    flexGrow: 1,
                    height: layout.header.height
                }}
            />
            <Row
                style={{
                    position: "fixed",
                    maxWidth: layout.maxWidth,
                    marginTop: 24,
                    transform: `skewY(${-skewAngle}rad)`,
                    paddingLeft: 24,
                    paddingRight: 24
                }}
            >
                <NavBarLink to="/">Home</NavBarLink>
                <NavBarLink to="https://github.com/re-do/redo" external>
                    GitHub
                </NavBarLink>
                <NavBarLink to="/blog">Blog</NavBarLink>
            </Row>
        </Card>
    )
}
