const ts = require('typescript');

module.exports = {
  process(src, filename) {
    const isJsx = filename.endsWith('.tsx') || filename.endsWith('.jsx');
    const result = ts.transpileModule(src, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: isJsx ? ts.JsxEmit.ReactJSX : ts.JsxEmit.None,
        esModuleInterop: true,
      },
      fileName: filename,
    });
    return { code: result.outputText };
  },
};
