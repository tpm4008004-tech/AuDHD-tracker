const fs = require('fs');
const path = require('path');

function parseAttributes(attrStr) {
  if (!attrStr || !attrStr.trim()) return 'null';
  const propPairs = [];
  let i = 0;

  while (i < attrStr.length) {
    while (i < attrStr.length && /\s/.test(attrStr[i])) i++;
    if (i >= attrStr.length) break;

    const nameMatch = attrStr.slice(i).match(/^([a-zA-Z0-9_-]+)/);
    if (!nameMatch) {
      i++;
      continue;
    }
    const key = nameMatch[1];
    i += key.length;

    while (i < attrStr.length && /\s/.test(attrStr[i])) i++;

    if (i < attrStr.length && attrStr[i] === '=') {
      i++;
      while (i < attrStr.length && /\s/.test(attrStr[i])) i++;

      if (i < attrStr.length) {
        const char = attrStr[i];
        if (char === '"' || char === "'") {
          const quote = char;
          i++;
          const startVal = i;
          while (i < attrStr.length && attrStr[i] !== quote) {
            if (attrStr[i] === '\\') i++;
            i++;
          }
          const val = attrStr.slice(startVal, i);
          i++;
          propPairs.push(`${JSON.stringify(key)}: ${JSON.stringify(val)}`);
        } else if (char === '{') {
          i++;
          let depth = 1;
          const startVal = i;
          let inString = null;
          while (i < attrStr.length && depth > 0) {
            const c = attrStr[i];
            if (inString) {
              if (c === inString && attrStr[i - 1] !== '\\') inString = null;
            } else if (c === '"' || c === "'" || c === '`') {
              inString = c;
            } else if (c === '{') {
              depth++;
            } else if (c === '}') {
              depth--;
            }
            i++;
          }
          const val = attrStr.slice(startVal, i - 1).trim();
          propPairs.push(`${JSON.stringify(key)}: ${val}`);
        }
      }
    } else {
      propPairs.push(`${JSON.stringify(key)}: true`);
    }
  }

  return propPairs.length ? `{ ${propPairs.join(', ')} }` : 'null';
}

function transformJsxRecursive(code) {
  let result = '';
  let i = 0;
  while (i < code.length) {
    if (code[i] === '<' && /[A-Za-z]/.test(code[i + 1])) {
      const match = parseJsxAt(code, i);
      if (match) {
        result += match.code;
        i = match.end;
        continue;
      }
    }
    result += code[i];
    i++;
  }
  return result;
}

function parseChildItems(str) {
  const items = [];
  let i = 0;
  let textBuffer = '';
  let inBacktick = false;

  while (i < str.length) {
    const char = str[i];
    if (inBacktick) {
      if (char === '`' && str[i - 1] !== '\\') inBacktick = false;
      textBuffer += char;
      i++;
      continue;
    }
    if (char === '`') {
      inBacktick = true;
      textBuffer += char;
      i++;
      continue;
    }

    if (char === '<' && /[A-Za-z]/.test(str[i + 1])) {
      if (textBuffer.trim() && !/^<\/[A-Za-z0-9_.]+>$/.test(textBuffer.trim())) {
        items.push(JSON.stringify(textBuffer.trim()));
      }
      textBuffer = '';
      const match = parseJsxAt(str, i);
      if (match) {
        items.push(match.code);
        i = match.end;
        continue;
      }
    } else if (char === '{') {
      if (textBuffer.trim() && !/^<\/[A-Za-z0-9_.]+>$/.test(textBuffer.trim())) {
        items.push(JSON.stringify(textBuffer.trim()));
      }
      textBuffer = '';
      let depth = 1;
      let startExpr = i + 1;
      i++;
      let inString = null;
      while (i < str.length && depth > 0) {
        const c = str[i];
        if (inString) {
          if (c === inString && str[i - 1] !== '\\') inString = null;
        } else if (c === '"' || c === "'" || c === '`') {
          inString = c;
        } else if (c === '{') {
          depth++;
        } else if (c === '}') {
          depth--;
        }
        i++;
      }
      const expr = str.slice(startExpr, i - 1).trim();
      if (expr) {
        items.push(transformJsxRecursive(expr));
      }
      continue;
    } else {
      textBuffer += char;
      i++;
    }
  }

  if (textBuffer.trim() && !/^<\/[A-Za-z0-9_.]+>$/.test(textBuffer.trim())) {
    items.push(JSON.stringify(textBuffer.trim()));
  }

  return items;
}

function parseJsxAt(code, start) {
  const tagMatch = code.slice(start).match(/^<([A-Za-z0-9_.]+)/);
  if (!tagMatch) return null;
  const tag = tagMatch[1];
  let cursor = start + 1 + tag.length;

  let inString = null;
  let braceCount = 0;
  let attrStart = cursor;

  while (cursor < code.length) {
    const char = code[cursor];
    if (inString) {
      if (char === inString && code[cursor - 1] !== '\\') inString = null;
    } else if (char === '"' || char === "'" || char === '`') {
      inString = char;
    } else if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
    } else if (!inString && braceCount === 0) {
      if (char === '/' && code[cursor + 1] === '>') {
        const attrs = code.slice(attrStart, cursor);
        const isComp = /^[A-Z]/.test(tag) || tag.includes('.');
        const tagArg = isComp ? tag : JSON.stringify(tag);
        const transformedAttrs = parseAttributes(attrs);
        return {
          code: `React.createElement(${tagArg}, ${transformedAttrs})`,
          end: cursor + 2,
        };
      } else if (char === '>') {
        const attrs = code.slice(attrStart, cursor);
        cursor++;
        const childStart = cursor;

        const closeTag = `</${tag}>`;
        let depth = 1;
        let childEnd = -1;

        while (cursor < code.length) {
          if (code.startsWith(closeTag, cursor)) {
            depth--;
            if (depth === 0) {
              childEnd = cursor;
              break;
            }
            cursor += closeTag.length;
          } else if (code.startsWith(`<${tag}`, cursor) && !/[A-Za-z0-9_.]/.test(code[cursor + 1 + tag.length] || '')) {
            let checkCursor = cursor + 1 + tag.length;
            let checkInString = null;
            let checkBraces = 0;
            let isSelf = false;
            while (checkCursor < code.length) {
              const cc = code[checkCursor];
              if (checkInString) {
                if (cc === checkInString && code[checkCursor - 1] !== '\\') checkInString = null;
              } else if (cc === '"' || cc === "'" || cc === '`') {
                checkInString = cc;
              } else if (cc === '{') {
                checkBraces++;
              } else if (cc === '}') {
                checkBraces--;
              } else if (!checkInString && checkBraces === 0) {
                if (cc === '/' && code[checkCursor + 1] === '>') {
                  isSelf = true;
                  break;
                } else if (cc === '>') {
                  break;
                }
              }
              checkCursor++;
            }

            if (!isSelf) {
              depth++;
            }
            cursor += 1 + tag.length;
          } else {
            cursor++;
          }
        }

        if (childEnd === -1) return null;

        const rawChildren = code.slice(childStart, childEnd);
        const childItems = parseChildItems(rawChildren);
        const isComp = /^[A-Z]/.test(tag) || tag.includes('.');
        const tagArg = isComp ? tag : JSON.stringify(tag);
        const transformedAttrs = parseAttributes(attrs);
        const childArg = childItems.length > 0 ? `, ${childItems.join(', ')}` : '';

        return {
          code: `React.createElement(${tagArg}, ${transformedAttrs}${childArg})`,
          end: childEnd + closeTag.length,
        };
      }
    }
    cursor++;
  }

  return null;
}

function transpileTsx(code) {
  let js = code;

  // 1. Remove import type & export interface/type
  js = js.replace(/import\s+type\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];?/g, '');
  js = js.replace(/export\s+interface\s+\w+[\s\S]*?\n\}/g, '');
  js = js.replace(/interface\s+\w+[\s\S]*?\n\}/g, '');
  js = js.replace(/export\s+type\s+\w+\s*=\s*[^;]+;/g, '');
  js = js.replace(/type\s+\w+\s*=\s*[^;]+;/g, '');

  // 2. Remove TS generics & annotations
  js = js.replace(/useState\s*<[\s\S]*?>/g, 'useState');
  js = js.replace(/\s+as\s+const\b/g, '');
  js = js.replace(/\s+as\s+[A-Za-z0-9_]+/g, '');
  js = js.replace(/(\w+)\?\s*:\s*[A-Za-z0-9_|\[\]\s,]+/g, '$1');

  // Strip TS annotations selectively
  js = js.replace(/:\s*React\.FC(\s*<[^>]+>)?/g, '');
  js = js.replace(/:\s*React\.ReactNode\b/g, '');
  js = js.replace(/\}\s*:\s*[A-Z][A-Za-z0-9_.]+\b/g, '}');
  js = js.replace(/\)\s*:\s*[A-Za-z0-9_.[\]<>\s|'"]+?\s*(?==>|\{)/g, ') ');
  js = js.replace(/const\s+([A-Za-z0-9_]+)\s*:\s*(readonly\s*)?[A-Za-z0-9_.<>\s|'"]+?(\[\])?\s*=/g, 'const $1 =');
  js = js.replace(/let\s+([A-Za-z0-9_]+)\s*:\s*(readonly\s*)?[A-Za-z0-9_.<>\s|'"]+?(\[\])?\s*=/g, 'let $1 =');
  js = js.replace(/var\s+([A-Za-z0-9_]+)\s*:\s*(readonly\s*)?[A-Za-z0-9_.<>\s|'"]+?(\[\])?\s*=/g, 'var $1 =');
  js = js.replace(/(\(|\,\s*)([A-Za-z0-9_]+)\?\s*:\s*[^,),=]+/g, '$1$2');
  js = js.replace(/(\(|\,\s*)([A-Za-z0-9_]+)\s*:\s*[^,),=]+/g, '$1$2');

  // 3. Module imports
  js = js.replace(/import\s+Link\s+from\s+['"]next\/link['"];?/g, 'var Link = ({ href, children, className }) => React.createElement("a", { href, className }, children);');
  js = js.replace(/import\s+React\s*,\s*\{([^}]+)\}\s+from\s+['"]react['"];?/g, 'var {$1} = React;');
  js = js.replace(/import\s+React\s+from\s+['"]react['"];?/g, '');
  js = js.replace(/import\s+([^{}\s,]+)\s*,\s*\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?/g, (m, d, named, src) => src === 'react' ? `var {${named}} = React;` : `var ${d} = require("${src}").default || require("${src}"); var {${named}} = require("${src}");`);
  js = js.replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?/g, 'var {$1} = require("$2");');
  js = js.replace(/import\s+([^{}\s]+)\s+from\s+['"]([^'"]+)['"];?/g, (m, d, src) => src === 'react' ? '' : `var ${d} = require("${src}").default || require("${src}");`);
  js = js.replace(/import\s+['"]([^'"]+)['"];?/g, 'require("$1");');

  // 4. Exports
  js = js.replace(/export\s+default\s+function\s*([A-Za-z0-9_]+)/g, (m, name) => 'function ' + name);
  js = js.replace(/export\s+const\s+/g, 'var ');
  js = js.replace(/export\s+default\s+([A-Za-z0-9_]+)\s*;?/g, 'module.exports = $1; module.exports.default = $1;');

  // 5. Strip comments inside JSX
  js = js.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

  // 6. Transform JSX recursively
  js = transformJsxRecursive(js);

  if (!js.includes('module.exports')) {
    js += '\nif (typeof Home !== "undefined") { module.exports = Home; module.exports.default = Home; }\n';
    js += 'if (typeof RootLayout !== "undefined") { module.exports = RootLayout; module.exports.default = RootLayout; }\n';
  }

  return js;
}

const targetFiles = [
  'components/EventBlock.tsx',
  'components/ChoreBlock.tsx',
  'components/AssignmentDeconstructor.tsx',
  'components/MealTracker.tsx',
  'components/DopamineFund.tsx',
  'components/ExpenseModal.tsx',
  'app/page.tsx',
  'app/assignments/page.tsx',
  'app/finances/page.tsx',
  '__tests__/components.test.tsx',
  '__tests__/AttendanceUI.test.tsx'
];

for (const file of targetFiles) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const result = transpileTsx(content);
    try {
      new Function('React', 'require', 'module', 'exports', result);
      console.log('✔ Syntax Valid:', file);
    } catch (e) {
      console.error('❌ Syntax Error in', file, ':', e.message);
    }
  }
}
