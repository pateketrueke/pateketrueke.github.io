const mircGrammar = require('./hljs-mirc');
const dubGrammar = require('./hljs-dub');
const xmlGrammar = require('./hljs-xml');

/** @param {import('highlight.js').HLJSApi} hljs */
module.exports = function setup(hljs) {
  hljs.registerLanguage('xml', xmlGrammar);
  hljs.registerLanguage('mirc', mircGrammar);
  hljs.registerLanguage('dub', dubGrammar);
};
