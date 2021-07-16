import React, { useState, useEffect } from "react"
import { Column } from "@re-do/components"
import { Header } from "./header"
import { layout } from "../constants"

export type PageProps = {
    header?: boolean
    subHeader?: boolean
    animateScroll?: boolean
    getStarted?: boolean
    overrideMobile?: boolean
    children: React.ReactNode
}

export const Page = ({
    children,
    header = true,
    subHeader = false,
    animateScroll = false,
    getStarted = true,
    overrideMobile = false
}: PageProps) => {
    const [width, setWidth] = useState(window.innerWidth)
    const useMobileLayout = width < 800
    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth)
        window.addEventListener("resize", handleResize)
        return () => {
            window.removeEventListener("resize", handleResize)
        }
    })
    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])
    return (
        <main
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100%"
            }}
        >
            {header ? (
                <Header
                    mobile={useMobileLayout}
                    displaySubHeader={subHeader}
                    animateScroll={animateScroll}
                    displayGetStarted={getStarted}
                    overrideMobile={overrideMobile}
                />
            ) : null}
            <Column
                align="center"
                style={{
                    maxWidth: layout.maxWidth,
                    padding: 8
                }}
            >
                {children}
            </Column>
        </main>
    )
}
