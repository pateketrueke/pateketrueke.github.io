/** @param {import('highlight.js').HLJSApi} hljs */
module.exports = function mircGrammar(hljs) {
  const KEYWORDS = [
    'alias', 'on', 'if', 'elseif', 'else', 'while', 'return', 'break',
    'continue', 'goto', 'halt', 'var', 'set', 'unset', 'unsetall',
    'inc', 'dec', 'timer', 'timerN', 'window', 'drawrect', 'drawdot',
    'drawline', 'drawtext', 'drawsave', 'drawscroll', 'drawpic', 'cls',
    'echo', 'msg', 'me', 'notice', 'join', 'part', 'quit', 'kick',
    'mode', 'topic', 'nick', 'away', 'back', 'ban', 'ignore', 'scon',
    'sockopen', 'sockwrite', 'sockclose', 'sockread', 'sockaccept',
    'sockpause', 'socklist', 'sockmark', 'write', 'writeln', 'filter',
    'fopen', 'fclose', 'fread', 'fwrite', 'fseek', 'fgetchar', 'fputchar',
    'hmake', 'hadd', 'hdel', 'hfree', 'hload', 'hsave', 'hinc', 'hdec',
    'play', 'splay', 'halt', 'bset', 'bcopy', 'bwrite', 'bread', 'bfind',
    'dialog', 'did', 'didtok', 'didreset', 'window', 'closemsg',
  ];

  const IDENTIFIERS = {
    className: 'built_in',
    begin: /\$[\w]+(?=[\s(,|]|$)/,
  };

  const VARIABLES = {
    className: 'variable',
    begin: /%[\w]+/,
  };

  const PARAMS = {
    className: 'variable',
    begin: /\$\d+/,
  };

  const BRACKET_EVAL = {
    className: 'variable',
    begin: /\[\s*/,
    end: /\s*\]/,
  };

  const COMMENT = hljs.COMMENT(';', '$', { relevance: 0 });

  const BLOCK_COMMENT = hljs.COMMENT('/\\*', '\\*/');

  const STRING = {
    className: 'string',
    begin: /"/,
    end: /"/,
    contains: [{ begin: /""/ }],
  };

  const EVENT_NAME = {
    className: 'type',
    begin: /^on\s+\*?:\w+:/im,
    relevance: 10,
  };

  const FLAGS = {
    className: 'meta',
    begin: /(?<=\becho\b\s|^\.[a-z]+\b\s)-[a-zA-Z]+/,
  };

  const NUMBER = {
    className: 'number',
    begin: /\b\d+(\.\d+)?\b/,
  };

  return {
    name: 'mIRC Script',
    aliases: ['mrc'],
    case_insensitive: true,
    keywords: {
      keyword: KEYWORDS.join(' '),
    },
    contains: [
      COMMENT,
      BLOCK_COMMENT,
      STRING,
      EVENT_NAME,
      IDENTIFIERS,
      VARIABLES,
      PARAMS,
      BRACKET_EVAL,
      FLAGS,
      NUMBER,
    ],
  };
};
