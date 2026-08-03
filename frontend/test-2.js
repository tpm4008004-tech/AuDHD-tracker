const fs = require('fs');
const content1 = fs.readFileSync('components/EventBlock.tsx', 'utf8');
const content2 = fs.readFileSync('components/AssignmentDeconstructor.tsx', 'utf8');
const { transpileTsx } = require('./test-transpile.js'); // we will print from script
