const integer = rootNode({
	in: arkString.submodule.integer as never,
	morphs: (s: string, ctx) => {
		if (!isWellFormedInteger(s))
			return ctx.error("a well-formed integer string")

		const parsed = Number.parseInt(s)
		return Number.isSafeInteger(parsed) ? parsed : (
				ctx.error(
					"an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER"
				)
			)
	}
})
