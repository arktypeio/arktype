import React from "react"
import { storiesOf } from "@storybook/react"
import { BrowserRouter as Router } from "react-router-dom"
import { Link } from "."

storiesOf("Link", module).add("Standard", () => {
    return (
        <Router>
            <Link to="/somewhere">Go somewhere</Link>
        </Router>
    )
})
