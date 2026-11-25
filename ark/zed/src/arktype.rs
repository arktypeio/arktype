//! ArkType for Zed.
//!
//! The `arktype` language server is vtsls, the TypeScript server Zed uses by
//! default, behind a small Node proxy (`server/`) that rewrites each
//! diagnostic's first line to the summary ErrorLens shows in VS Code with the
//! `errorLens.replace` rules from `ark/extension/package.json`. Zed shows only
//! that first line inline, so `"number | strin"` reads `"number | string"`
//! at the end of the line, as it does in VS Code.
//!
//! The extension also asks whichever TypeScript server runs (this one, Zed's
//! own vtsls or typescript-language-server) not to auto-import from Node's
//! `os` module, whose `type` would otherwise compete with ArkType's.

use std::{env, fs};

use zed_extension_api::{
    self as zed,
    serde_json::{Value, json},
    settings::LspSettings,
};

const SERVER_NAME: &str = "arktype";

const VTSLS_PACKAGE: &str = "@vtsls/language-server";
const VTSLS_SCRIPT: &str = "node_modules/@vtsls/language-server/bin/vtsls.js";

/// The proxy's sources, which Node runs directly by stripping their types.
const PROXY_DIR: &str = "arktype-lsp";
const PROXY_FILES: [(&str, &str); 3] = [
    ("main.ts", include_str!("../server/main.ts")),
    ("proxy.ts", include_str!("../server/proxy.ts")),
    ("diagnostics.ts", include_str!("../server/diagnostics.ts")),
];

/// Keeps auto-import from offering `type` from `os` or `node:os`.
const AUTO_IMPORT_SPECIFIER_EXCLUDE_REGEXES: [&str; 1] = ["^(node:)?os$"];

struct ArkTypeExtension {
    installed: bool,
}

impl ArkTypeExtension {
    fn install_if_needed(&mut self, language_server_id: &zed::LanguageServerId) -> zed::Result<()> {
        let vtsls_exists = fs::metadata(VTSLS_SCRIPT).is_ok_and(|stat| stat.is_file());
        if self.installed && vtsls_exists {
            return Ok(());
        }

        zed::set_language_server_installation_status(
            language_server_id,
            &zed::LanguageServerInstallationStatus::CheckingForUpdate,
        );
        let latest = zed::npm_package_latest_version(VTSLS_PACKAGE);
        let installed = zed::npm_package_installed_version(VTSLS_PACKAGE)?;
        match latest {
            Ok(latest) if installed.as_ref() != Some(&latest) || !vtsls_exists => {
                zed::set_language_server_installation_status(
                    language_server_id,
                    &zed::LanguageServerInstallationStatus::Downloading,
                );
                if let Err(error) = zed::npm_install_package(VTSLS_PACKAGE, &latest) {
                    // an older install still works offline
                    if !vtsls_exists {
                        return Err(error);
                    }
                }
            }
            Ok(_) => {}
            Err(error) if !vtsls_exists => return Err(error),
            Err(_) => {}
        }

        // written on each start so the proxy always matches the extension
        fs::create_dir_all(PROXY_DIR).map_err(|error| error.to_string())?;
        for (name, source) in PROXY_FILES {
            fs::write(format!("{PROXY_DIR}/{name}"), source).map_err(|error| error.to_string())?;
        }

        self.installed = true;
        Ok(())
    }
}

/// The workspace configuration Zed gives its own vtsls
/// (`crates/languages/src/vtsls.rs`), so switching to this server keeps
/// the TypeScript behavior Zed users expect.
fn vtsls_configuration() -> Value {
    let language = json!({
        "suggest": { "completeFunctionCalls": true },
        "inlayHints": {
            "parameterNames": { "enabled": "all", "suppressWhenArgumentMatchesName": false },
            "parameterTypes": { "enabled": true },
            "variableTypes": { "enabled": true, "suppressWhenTypeMatchesName": false },
            "propertyDeclarationTypes": { "enabled": true },
            "functionLikeReturnTypes": { "enabled": true },
            "enumMemberValues": { "enabled": true }
        },
        "implementationsCodeLens": {
            "enabled": true,
            "showOnAllClassMethods": true,
            "showOnInterfaceMethods": true
        },
        "referencesCodeLens": { "enabled": true, "showOnAllFunctions": true },
        "tsserver": { "maxTsServerMemory": 8192 }
    });
    let mut configuration = json!({
        "typescript": language,
        "javascript": language,
        "vtsls": {
            "experimental": {
                "completion": { "enableServerSideFuzzyMatch": true, "entriesLimit": 5000 }
            },
            "autoUseWorkspaceTsdk": true
        }
    });
    merge_json(&mut configuration, vtsls_auto_import_configuration());
    configuration
}

fn vtsls_auto_import_configuration() -> Value {
    let preferences = json!({
        "preferences": { "autoImportSpecifierExcludeRegexes": AUTO_IMPORT_SPECIFIER_EXCLUDE_REGEXES }
    });
    json!({ "typescript": preferences, "javascript": preferences })
}

/// Merges `source` into `target`, recursing into objects; any other value in
/// `source` replaces the one in `target`, as a user's setting does.
fn merge_json(target: &mut Value, source: Value) {
    match (target, source) {
        (Value::Object(target), Value::Object(source)) => {
            for (key, value) in source {
                match target.get_mut(&key) {
                    Some(existing) => merge_json(existing, value),
                    None => {
                        target.insert(key, value);
                    }
                }
            }
        }
        (target, source) => *target = source,
    }
}

impl zed::Extension for ArkTypeExtension {
    fn new() -> Self {
        Self { installed: false }
    }

    fn language_server_command(
        &mut self,
        language_server_id: &zed::LanguageServerId,
        worktree: &zed::Worktree,
    ) -> zed::Result<zed::Command> {
        let binary = LspSettings::for_worktree(SERVER_NAME, worktree)
            .ok()
            .and_then(|settings| settings.binary);
        self.install_if_needed(language_server_id)?;

        let work_dir = env::current_dir().map_err(|error| error.to_string())?;
        let path_in_work_dir = |path: &str| work_dir.join(path).to_string_lossy().to_string();
        let mut args = vec![
            // Node runs TypeScript without it from 22.18, but Zed accepts a
            // system Node from 22.0
            "--experimental-strip-types".to_string(),
            path_in_work_dir(&format!("{PROXY_DIR}/main.ts")),
            path_in_work_dir(VTSLS_SCRIPT),
            "--stdio".to_string(),
        ];
        if let Some(extra) = binary.as_ref().and_then(|binary| binary.arguments.clone()) {
            args.extend(extra);
        }

        Ok(zed::Command {
            command: match binary.as_ref().and_then(|binary| binary.path.clone()) {
                Some(node) => node,
                None => zed::node_binary_path()?,
            },
            args,
            env: binary
                .and_then(|binary| binary.env)
                .map(|env| env.into_iter().collect())
                .unwrap_or_default(),
        })
    }

    fn language_server_initialization_options(
        &mut self,
        _language_server_id: &zed::LanguageServerId,
        worktree: &zed::Worktree,
    ) -> zed::Result<Option<Value>> {
        Ok(LspSettings::for_worktree(SERVER_NAME, worktree)
            .ok()
            .and_then(|settings| settings.initialization_options))
    }

    fn language_server_workspace_configuration(
        &mut self,
        _language_server_id: &zed::LanguageServerId,
        worktree: &zed::Worktree,
    ) -> zed::Result<Option<Value>> {
        let mut configuration = vtsls_configuration();
        if let Some(settings) = LspSettings::for_worktree(SERVER_NAME, worktree)
            .ok()
            .and_then(|settings| settings.settings)
        {
            merge_json(&mut configuration, settings);
        }
        Ok(Some(configuration))
    }

    fn language_server_additional_workspace_configuration(
        &mut self,
        _language_server_id: &zed::LanguageServerId,
        target_language_server_id: &zed::LanguageServerId,
        _worktree: &zed::Worktree,
    ) -> zed::Result<Option<Value>> {
        // Zed unions this into the target's configuration, so a user's own
        // excludes are kept alongside it
        Ok(match target_language_server_id.as_ref() {
            "vtsls" => Some(vtsls_auto_import_configuration()),
            _ => None,
        })
    }

    fn language_server_additional_initialization_options(
        &mut self,
        _language_server_id: &zed::LanguageServerId,
        target_language_server_id: &zed::LanguageServerId,
        _worktree: &zed::Worktree,
    ) -> zed::Result<Option<Value>> {
        // typescript-language-server passes `preferences` to tsserver
        Ok(match target_language_server_id.as_ref() {
            "typescript-language-server" => Some(json!({
                "preferences": {
                    "autoImportSpecifierExcludeRegexes": AUTO_IMPORT_SPECIFIER_EXCLUDE_REGEXES
                }
            })),
            _ => None,
        })
    }
}

zed::register_extension!(ArkTypeExtension);

#[cfg(test)]
mod tests {
    use super::*;
    use zed_extension_api::serde_json;

    #[test]
    fn user_settings_override_defaults_and_keep_the_exclude() {
        let mut configuration = vtsls_configuration();
        merge_json(
            &mut configuration,
            serde_json::from_str(r#"{ "typescript": { "tsserver": { "maxTsServerMemory": 4096 } } }"#)
                .unwrap(),
        );
        assert_eq!(configuration["typescript"]["tsserver"]["maxTsServerMemory"], 4096);
        assert_eq!(
            configuration["typescript"]["preferences"]["autoImportSpecifierExcludeRegexes"],
            json!(["^(node:)?os$"])
        );
        assert_eq!(
            configuration["javascript"]["preferences"]["autoImportSpecifierExcludeRegexes"],
            json!(["^(node:)?os$"])
        );
    }
}
