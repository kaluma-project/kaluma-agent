module.exports = {
  "extends": "standard",
  "installedESLint": true,
  "plugins": [
    "standard",
    "promise"
  ],
  "rules": {
    "indent": ["error", 2],
    "no-eval": 0
  },
  "parserOptions": {
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "globals": {
  },
};
