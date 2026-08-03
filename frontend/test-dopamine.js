const fs = require('fs');
const content = fs.readFileSync('components/DopamineFund.tsx', 'utf8');
const testScript = require('./test-transpile.js');

// We can inspect by running transpileTsx directly
