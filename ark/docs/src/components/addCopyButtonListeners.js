const hoverSelector = ".twoslash-popup-code"
const errorSelector = ".twoslash-error-line"
const completionSelector = ".twoslash-completion-cursor"
const metaSelector = `${hoverSelector}, ${errorSelector}, ${completionSelector}`

const distillTwoslashCode = container => {
	const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)

	let src = ""
	while (walker.nextNode()) {
		/** @type { Element } */
		const parentNode = walker.currentNode.parentNode
		if (parentNode.closest(errorSelector)) {
			// if a twoslash error was rendered in this position, we need an additional newline
			src += "\n"
		}
		if (!parentNode?.closest(metaSelector)) {
			// if the node is not a meta node (hover, error or completion) add its textContent
			src += walker.currentNode.textContent ?? ""
		}
	}

	return src.trim()
}

globalThis.addCopyButtonListeners = () => {
	document.querySelectorAll(".code-container").forEach(codeContainer => {
		const copyButton = codeContainer.querySelector(".copy-button")
		const icon = codeContainer.querySelector(".copy-icon")

		copyButton.addEventListener("click", async () => {
			const textToCopy = distillTwoslashCode(codeContainer)
			await navigator.clipboard.writeText(textToCopy)

			icon.setAttribute("src", "/src/assets/check.svg")
			copyButton.setAttribute("disabled", "1")
			copyButton.setAttribute("style", "opacity: .6;")
			setTimeout(() => {
				icon.setAttribute("src", "/src/assets/copy.svg")
				copyButton.removeAttribute("disabled")
				copyButton.removeAttribute("style")
			}, 2000)
		})
	})
}
