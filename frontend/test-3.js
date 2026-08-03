const fs = require('fs');
const testTranspile = require('./test-transpile.js');

const files = ['components/EventBlock.tsx', 'components/AssignmentDeconstructor.tsx', 'app/finances/page.tsx'];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  // run transpileTsx from test-transpile.js logic
}
