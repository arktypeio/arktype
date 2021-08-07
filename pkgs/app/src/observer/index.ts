import { finder } from "@medv/finder"
import { Step } from "@re-do/model"

const browserWindow: Window & {
    notify: (e: Step & { timeStamp: number }) => void
} = window as any

const clickListener = (e: Event) => {
    browserWindow.notify({
        kind: "click",
        timeStamp: e.timeStamp,
        element: { selector: finder(e.target as HTMLElement) }
    })
}

const setListener = (e: Event) => {
    browserWindow.notify({
        kind: "set",
        timeStamp: e.timeStamp,
        element: { selector: finder(e.target as HTMLElement) },
        value: (e.target as any)?.value
    })
}

const mouseUpListener = (e: Event) => {
    const selection = document.getSelection()?.toString()
    if (selection) {
        browserWindow.notify({
            kind: "assertText",
            timeStamp: e.timeStamp,
            element: { selector: finder(e.target as HTMLElement) },
            value: selection
        })
    }
}

const listeners = {
    click: clickListener,
    dblclick: clickListener,
    submit: clickListener,
    change: setListener,
    select: setListener,
    mouseup: mouseUpListener
}

Object.entries(listeners).forEach(([eventName, listener]) =>
    browserWindow.addEventListener(eventName, listener, true)
)

browserWindow.notify({
    kind: "init"
} as any)
