import { addDecorator } from "@storybook/react"
import { withDefaultContext } from "./defaultContext"

addDecorator(withDefaultContext())
