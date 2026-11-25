package io.arktype.jetbrains.completion

import com.intellij.codeInsight.completion.CompletionConfidence
import com.intellij.lang.javascript.psi.JSArgumentList
import com.intellij.lang.javascript.psi.JSArrayLiteralExpression
import com.intellij.lang.javascript.psi.JSCallExpression
import com.intellij.lang.javascript.psi.JSLiteralExpression
import com.intellij.lang.javascript.psi.JSObjectLiteralExpression
import com.intellij.lang.javascript.psi.JSParenthesizedExpression
import com.intellij.lang.javascript.psi.JSProperty
import com.intellij.lang.javascript.psi.JSReferenceExpression
import com.intellij.openapi.editor.Editor
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.util.PsiTreeUtil
import com.intellij.util.ThreeState
import io.arktype.jetbrains.highlight.ArkCallees
import io.arktype.jetbrains.settings.ArkTypeSettings

/**
 * The extension's `"editor.quickSuggestions": { "strings": "on" }`: completion
 * pops up while typing in a string, where the IDE otherwise waits for
 * Ctrl+Space. Limited to strings in ArkType definitions, whose completions
 * (`"string | num"` → `"string | number"`) TypeScript provides.
 */
class ArkTypeCompletionConfidence : CompletionConfidence() {
	override fun shouldSkipAutopopup(editor: Editor, contextElement: PsiElement, psiFile: PsiFile, offset: Int): ThreeState {
		if (!ArkTypeSettings.get().state.completionInStrings) return ThreeState.UNSURE
		val literal = PsiTreeUtil.getParentOfType(contextElement, JSLiteralExpression::class.java, false) ?: return ThreeState.UNSURE
		if (!literal.isQuotedLiteral && !isTemplate(literal)) return ThreeState.UNSURE
		return if (isInDefinition(literal)) ThreeState.NO else ThreeState.UNSURE
	}

	private fun isTemplate(literal: JSLiteralExpression): Boolean = literal.text.startsWith("`")

	companion object {
		/**
		 * Whether [literal] is an argument of an ArkType definition call, directly
		 * or nested in its objects and tuples: `type({ a: ["string"] })`.
		 */
		fun isInDefinition(literal: PsiElement): Boolean {
			var element: PsiElement = literal
			while (true) {
				val parent = element.parent ?: return false
				when (parent) {
					is JSProperty, is JSObjectLiteralExpression, is JSArrayLiteralExpression, is JSParenthesizedExpression -> element = parent
					is JSArgumentList -> {
						val call = parent.parent as? JSCallExpression ?: return false
						val callee = call.methodExpression as? JSReferenceExpression ?: return false
						val name = callee.referenceName ?: return false
						return ArkCallees.isArkCallee(name, qualified = callee.qualifier != null)
					}
					else -> return false
				}
			}
		}
	}
}
