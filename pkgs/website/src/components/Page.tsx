import React from "react"
import Layout from "@theme/Layout"
import { DefaultTheme, Column } from "@re-do/components"
import { Header } from "./header"
import { layout } from "./constants"

export type PageProps = {
    header?: boolean
    subHeader?: boolean
    children: React.ReactNode
}

export const Page = ({
    children,
    header = true,
    subHeader = false
}: PageProps) => {
    return (
        <DefaultTheme>
            <Layout>
                <main
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        width: "100%"
                    }}
                >
                    {header ? <Header displaySubHeader={subHeader} /> : null}
                    <Column
                        align="center"
                        style={{ maxWidth: layout.maxWidth }}
                    >
                        {children}
                    </Column>
                </main>
            </Layout>
        </DefaultTheme>
    )
}
