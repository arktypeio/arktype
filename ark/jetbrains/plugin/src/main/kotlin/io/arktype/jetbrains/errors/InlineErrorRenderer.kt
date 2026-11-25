package io.arktype.jetbrains.errors

import com.intellij.openapi.editor.EditorCustomElementRenderer
import com.intellij.openapi.editor.Inlay
import com.intellij.openapi.editor.colors.EditorFontType
import com.intellij.openapi.editor.markup.TextAttributes
import com.intellij.ui.JBColor
import java.awt.Color
import java.awt.Graphics
import java.awt.Rectangle

/**
 * Draws an inline message after the end of its line, in ErrorLens's default
 * colors for its severity and the editor's font, `errorLens.margin` (4ch)
 * from the code.
 */
class InlineErrorRenderer(val message: InlineMessage) : EditorCustomElementRenderer {
	override fun calcWidthInPixels(inlay: Inlay<*>): Int {
		val metrics = inlay.editor.contentComponent.getFontMetrics(font(inlay))
		return metrics.charWidth(' ') * MARGIN_CHARS + metrics.stringWidth(message.text)
	}

	override fun paint(inlay: Inlay<*>, g: Graphics, targetRegion: Rectangle, textAttributes: TextAttributes) {
		val editor = inlay.editor
		val font = font(inlay)
		g.font = font
		g.color = colors.getValue(message.severity)
		val metrics = g.getFontMetrics(font)
		g.drawString(message.text, targetRegion.x + metrics.charWidth(' ') * MARGIN_CHARS, targetRegion.y + editor.ascent)
	}

	private fun font(inlay: Inlay<*>) = inlay.editor.colorsScheme.getFont(EditorFontType.PLAIN)

	companion object {
		private const val MARGIN_CHARS = 4

		/** ErrorLens's `errorLens.*BackgroundLight` and `errorLens.*Background` defaults */
		private val backgrounds: Map<Severity, Color> = mapOf(
			Severity.ERROR to JBColor(Color(0xe4, 0x54, 0x54, 0x20), Color(0xe4, 0x54, 0x54, 0x1b)),
			Severity.WARNING to JBColor(Color(0xff, 0x94, 0x2f, 0x20), Color(0xff, 0x94, 0x2f, 0x1b)),
			Severity.INFO to JBColor(Color(0x00, 0xb7, 0xe4, 0x20), Color(0x00, 0xb7, 0xe4, 0x20))
		)

		fun lineBackground(severity: Severity): Color = backgrounds.getValue(severity)

		/** ErrorLens's `errorLens.*ForegroundLight` and `errorLens.*Foreground` defaults */
		private val colors: Map<Severity, Color> = mapOf(
			Severity.ERROR to JBColor(Color(0xe4, 0x54, 0x54), Color(0xff, 0x64, 0x64)),
			Severity.WARNING to JBColor(Color(0xff, 0x94, 0x2f), Color(0xfa, 0x97, 0x3a)),
			Severity.INFO to JBColor(Color(0x00, 0xb7, 0xe4), Color(0x00, 0xb7, 0xe4))
		)
	}
}
