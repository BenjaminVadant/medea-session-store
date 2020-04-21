module.exports = {
  extends: [
    'eslint:recommended',
    'airbnb-base'
  ],
  env: {
    browser: true,
    node: true
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-underscore-dangle': 'off',
    'arrow-parens': ['error', 'always'],
    'no-await-in-loop': 'off',
    'no-param-reassign': ['error', { props: false }],
    'no-shadow': ['error', { hoist: 'all' }],
    'no-return-assign': ['error', 'always'],
    'no-new': 'error',
    'no-return-await': 'error',
    'no-self-compare': 'error',
  },
};
