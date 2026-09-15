export default {
  '*.{ts,js,mjs,cjs}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,css,html,yml,yaml}': ['prettier --write'],
};
