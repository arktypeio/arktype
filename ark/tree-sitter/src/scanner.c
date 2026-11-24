// TextMate matches a quoted definition and a regex inside one with a regex
// over a single line: `(["'`])(.*?)(\\)*(\1)` and `(\/)(.*?)(\\)*(\1)`. Both
// need lookahead a grammar can't express, so this scanner answers one
// question for each: does the delimiter close later on the same line (and,
// for a regex, before the definition's own closing quote)?

#include "tree_sitter/parser.h"

enum TokenType {
	DEFINITION_START_DOUBLE,
	DEFINITION_START_SINGLE,
	DEFINITION_START_BACKTICK,
	REGEX_START_DOUBLE,
	REGEX_START_SINGLE,
	REGEX_START_BACKTICK,
	ERROR_SENTINEL
};

void *tree_sitter_arktype_external_scanner_create(void) { return NULL; }
void tree_sitter_arktype_external_scanner_destroy(void *payload) {}
unsigned tree_sitter_arktype_external_scanner_serialize(void *payload, char *buffer) { return 0; }
void tree_sitter_arktype_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {}

static bool is_line_end(TSLexer *lexer) {
	return lexer->eof(lexer) || lexer->lookahead == '\n' || lexer->lookahead == '\r';
}

// Consumes `delimiter`, marks the token as that one character, then reports
// whether `delimiter` occurs again on the line before any `stop` character.
static bool closes_on_line(TSLexer *lexer, int32_t delimiter, int32_t stop) {
	lexer->advance(lexer, false);
	lexer->mark_end(lexer);
	while (!is_line_end(lexer)) {
		if (lexer->lookahead == delimiter) return true;
		if (lexer->lookahead == stop) return false;
		lexer->advance(lexer, false);
	}
	return false;
}

bool tree_sitter_arktype_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
	// in error recovery every symbol is valid; leave it to the grammar
	if (valid_symbols[ERROR_SENTINEL]) return false;

	if (valid_symbols[DEFINITION_START_DOUBLE] || valid_symbols[DEFINITION_START_SINGLE] ||
		valid_symbols[DEFINITION_START_BACKTICK]) {
		while (lexer->lookahead == ' ' || lexer->lookahead == '\t' || lexer->lookahead == '\n' ||
			   lexer->lookahead == '\r') {
			lexer->advance(lexer, true);
		}
		int32_t quote = lexer->lookahead;
		enum TokenType type;
		if (quote == '"' && valid_symbols[DEFINITION_START_DOUBLE]) type = DEFINITION_START_DOUBLE;
		else if (quote == '\'' && valid_symbols[DEFINITION_START_SINGLE]) type = DEFINITION_START_SINGLE;
		else if (quote == '`' && valid_symbols[DEFINITION_START_BACKTICK]) type = DEFINITION_START_BACKTICK;
		else return false;
		if (!closes_on_line(lexer, quote, 0)) return false;
		lexer->result_symbol = type;
		return true;
	}

	if (lexer->lookahead != '/') return false;
	if (valid_symbols[REGEX_START_DOUBLE]) {
		if (!closes_on_line(lexer, '/', '"')) return false;
		lexer->result_symbol = REGEX_START_DOUBLE;
		return true;
	}
	if (valid_symbols[REGEX_START_SINGLE]) {
		if (!closes_on_line(lexer, '/', '\'')) return false;
		lexer->result_symbol = REGEX_START_SINGLE;
		return true;
	}
	if (valid_symbols[REGEX_START_BACKTICK]) {
		if (!closes_on_line(lexer, '/', '`')) return false;
		lexer->result_symbol = REGEX_START_BACKTICK;
		return true;
	}
	return false;
}
