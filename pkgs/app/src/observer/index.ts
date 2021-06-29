import { finder } from "@medv/finder"
import { supportedEvents, SupportedEvent } from "common"

const getEventData = (e: Event) => {
    const kind = supportedEvents[e.type as SupportedEvent]
    const data: any = { kind, timeStamp: e.timeStamp }
    if (e.target) {
        const target = e.target as HTMLElement
        data.element = { selector: finder(target as HTMLElement) }
        if (kind === "set") {
            data.value = (target as HTMLInputElement).value
        }
    }
    return data
}

const watchPage = async () => {
    const browserWindow: Window & {
        notify: (e: Event) => void
    } = window as any
    const handler = async (e: Event) => {
        browserWindow.notify(getEventData(e))
    }
    Object.keys(supportedEvents).forEach((event) =>
        browserWindow.addEventListener(event, handler, true)
    )
}

watchPage()
