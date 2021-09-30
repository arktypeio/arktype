import React, { useState } from "react"
import { AnimatedLogo, Card, Row, Button, Icons } from "@re-do/components"
import { Drawer, List } from "@material-ui/core"
import { layout } from "../../constants.js"
import { NavBarLink } from "./NavBarLink"

export type NavBarProps = {
    skewAngle: number
    mobile: boolean
}

export const NavBar = ({ skewAngle, mobile = false }: NavBarProps) => {
    return (
        <div style={{ height: layout.header.height, width: "100%" }}>
            <Card
                elevation={24}
                style={{
                    position: "fixed",
                    top: -24,
                    left: 0,
                    zIndex: 2,
                    width: "100%",
                    transform: `skewY(${skewAngle}rad)`,
                    transformOrigin: "center",
                    display: "flex",
                    justifyContent: "center",
                    padding: 0
                }}
            >
                <AnimatedLogo
                    style={{
                        marginTop: 32,
                        marginBottom: 8,
                        transform: `skewY(${-skewAngle}rad)`,
                        flexGrow: 1,
                        height: layout.header.height,
                        maxWidth: "60%"
                    }}
                />
                <Row
                    style={{
                        position: "fixed",
                        maxWidth: layout.maxWidth,
                        marginTop: 24,
                        padding: 0,
                        transform: `skewY(${-skewAngle}rad)`
                    }}
                >
                    {mobile ? <MobileNav /> : <DesktopNav />}
                </Row>
            </Card>
        </div>
    )
}

const DesktopNav = () => (
    <>
        <NavBarLink to="/" text="Home" mobile={false} />
        <NavBarLink
            to="https://github.com/re-do/redo"
            text="GitHub"
            mobile={false}
        />
        <NavBarLink to="/blog" text="Blog" mobile={false} />
        <NavBarLink to="https://docs.redo.qa" text="Docs" mobile={false} />
    </>
)

const MobileNav = () => {
    const [open, setOpen] = useState(false)
    return (
        <>
            <Button
                Icon={Icons.menu}
                fontSize={36}
                onClick={() => setOpen(true)}
            />
            <Drawer
                open={open}
                PaperProps={{
                    style: {
                        width: 160
                    }
                }}
                onClose={() => setOpen(false)}
            >
                <List component="nav">
                    <NavBarLink
                        Icon={Icons.home}
                        to="/"
                        text="Home"
                        mobile={true}
                    />
                    <NavBarLink
                        Icon={Icons.gitHub}
                        to="https://github.com/re-do/redo"
                        text="GitHub"
                        mobile={true}
                    />
                    <NavBarLink
                        Icon={Icons.blog}
                        to="/blog"
                        text="Blog"
                        mobile={true}
                    />
                    <NavBarLink
                        Icon={Icons.menuBook}
                        to="https://docs.redo.qa"
                        text="Docs"
                        mobile={true}
                    />
                </List>
            </Drawer>
        </>
    )
}
