/** @param {import('highlight.js').HLJSApi} hljs */
module.exports = function dubGrammar(hljs) {
  const COMMENT = hljs.COMMENT(';', '$', { relevance: 0 });

  const TRACK_LABEL = {
    className: 'string',
    begin: /^#/m,
    end: /(?=;|$)/,
    relevance: 10,
  };

  const NOTE = {
    className: 'type',
    begin: /(?<!^)\b[a-gA-G][#b]?\d\w*?\b/,
  };

  const NUMBER = {
    className: 'number',
    begin: /(?<=\s)[/*-]?[\d.]+(?!\w)\b/,
  };

  const PLACEHOLDER = {
    className: 'variable',
    begin: /%\w+/,
  };

  const ANNOTATION = {
    className: 'meta',
    begin: /^@\w+|\btrack\b/m,
  };

  const PATTERN = {
    className: 'punctuation',
    begin: /[\[\]x_-]+|[|%]/,
  };

  const INVALID_INDENTED = {
    className: 'invalid',
    begin: /^\s+.+$/m,
    relevance: 0,
  };

  return {
    name: 'DUB on SCOOPS',
    aliases: ['dub'],
    contains: [
      COMMENT,
      TRACK_LABEL,
      NOTE,
      NUMBER,
      PLACEHOLDER,
      ANNOTATION,
      PATTERN,
      INVALID_INDENTED,
    ],
  };
};
