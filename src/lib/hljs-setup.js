const mircGrammar = require('./hljs-mirc');

/** @param {import('highlight.js').HLJSApi} hljs */
module.exports = function setup(hljs) {
  hljs.registerLanguage('mirc', mircGrammar);
};
