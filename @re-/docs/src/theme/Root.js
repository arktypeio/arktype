import React from "react"
import { Helmet } from "react-helmet-async"
import { useLocation } from "@docusaurus/router"

const hideModelVersionDropdownCss = `
.navbar-model-versions {
    display: none;
}
`

// Default implementation, that you can customize
export default ({ children }) => {
    const { pathname } = useLocation()
    return (
        <>
            <Helmet>
                {pathname.startsWith("/model") ? null : (
                    <style>{hideModelVersionDropdownCss}</style>
                )}
            </Helmet>
            {children}
        </>
    )
}
