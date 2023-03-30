// based on https://github.dev/shikijs/shiki/blob/99a9a3dcd2f2504d36b0672968fb05be53fd73cb/scripts/grammars/updateGrammarSourceFiles.ts
// License MIT Pine Wu
import fs from "fs";
import path from "path";
import { parse as jsoncParse } from "jsonc-parser";

console.log("Updating lib/util/languages.mjs...");

const languageAliases = {
  bat: ["batch"],
  berry: ["be"],
  cadence: ["cdc"],
  clojure: ["clj"],
  codeql: ["ql"],
  csharp: ["c#", "cs"],
  docker: ["dockerfile"],
  erlang: ["erl"],
  fsharp: ["f#", "fs"],
  haskell: ["hs"],
  handlebars: ["hbs"],
  ini: ["properties"],
  javascript: ["js"],
  jssm: ["fsl"],
  kusto: ["kql"],
  make: ["makefile"],
  markdown: ["md"],
  "objective-c": ["objc"],
  powershell: ["ps", "ps1"],
  pug: ["jade"],
  python: ["py"],
  raku: ["perl6"],
  ruby: ["rb"],
  rust: ["rs"],
  "html-ruby-erb": ["erb"],
  shaderlab: ["shader"],
  shellscript: ["bash", "console", "sh", "shell", "zsh"],
  stylus: ["styl"],
  typescript: ["ts"],
  vb: ["cmd"],
  viml: ["vim", "vimscript"],
  wenyan: ["文言"],
  yaml: ["yml"],
};

const embeddedLanguagesToExclude = [
  // `jinja-html` instead
  "jinja",
  // `php` instead
  "php-html",
  // embedded by `cpp`
  "cpp-macro",
];

function parseJson(jsonc) {
  const errors = [];
  const result = jsoncParse(jsonc, errors, { allowTrailingComma: true });
  if (errors.length) {
    throw errors[0];
  }
  return result;
}

function getLanguagesData() {
  const files = fs.readdirSync("./grammars");
  const ids = files
    .map((f) => f.replace(".tmLanguage.json", ""))
    .filter((id) => {
      return !embeddedLanguagesToExclude.includes(id);
    });

  const scopeToIdMap = {};
  ids.forEach((id) => {
    const grammarPath = path.resolve("./grammars", `${id}.tmLanguage.json`);
    const grammarSrc = fs.readFileSync(grammarPath, "utf-8");
    const grammar = parseJson(grammarSrc);

    scopeToIdMap[grammar.scopeName] = id;
  });

  const result = [];

  ids.forEach((id) => {
    const grammarPath = path.resolve("./grammars", `${id}.tmLanguage.json`);
    const grammarSrc = fs.readFileSync(grammarPath, "utf-8");
    const grammar = parseJson(grammarSrc);

    const embeddedLangs = new Set();
    const matches = [...grammarSrc.matchAll(/"include": "([^#$].+)"/g)];
    matches.forEach(([full, captured]) => {
      const scope = captured.split("#")[0];
      if (
        !grammar.scopeName ||
        (grammar.scopeName && scope !== grammar.scopeName)
      ) {
        if (scopeToIdMap[scope]) {
          embeddedLangs.add(scopeToIdMap[scope]);
        }
      }
    });

    const data = {
      id,
      scopeName: grammar.scopeName,
      path: `${id}.tmLanguage.json`,
    };

    if (languageAliases[id]) {
      data.aliases = languageAliases[id];
    }

    if (embeddedLangs.size > 0) {
      data.embeddedLangs = [...embeddedLangs];
    }

    result.push(data);
  });
  return result;
}

const result = getLanguagesData();
const content = `// generated by lib/utils/2.update-languages.mjs
export const languages = ${JSON.stringify(result, null, 2)};`;

// save result
fs.writeFileSync("./utils/languages.mjs", content, "utf8");

console.log("Done updating lib/util/languages.mjs");
