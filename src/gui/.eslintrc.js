module.exports = {
  'extends': '../../.eslintrc.js',
  'overrides': [
      {
          'files': ["glRenderer.js"],
          'parserOptions':
          {
              'sourceType': 'module'
          }
      }
  ],
};
