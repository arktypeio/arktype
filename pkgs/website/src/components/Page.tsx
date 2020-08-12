import React, { useState, useEffect } from "react"
import { Column } from "@re-do/components"
import { Header } from "./header"
import { layout } from "../constants"

export type PageProps = {
    header?: boolean
    subHeader?: boolean
    animateScroll?: boolean
    children: React.ReactNode
}

export const Page = ({
    children,
    header = true,
    subHeader = false,
    animateScroll = false
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
                />
            ) : null}
            <Column
                align="center"
                style={{
                    maxWidth: layout.maxWidth
                }}
            >
                {children}
            </Column>
        </main>
    )
}
