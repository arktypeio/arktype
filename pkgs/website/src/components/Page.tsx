import React from "react"
import Layout from "@theme/Layout"
import { DefaultTheme } from "@re-do/components"

export type PageProps = {
    children: React.ReactNode
}

export const Page = ({ children }: PageProps) => {
    return (
        <DefaultTheme>
            <Layout>
                <main
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center"
                    }}
                >
                    {children}
                </main>
            </Layout>
        </DefaultTheme>
    )
}
