// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs"

export default withNuxt(
  {
    ignores: ["dist", ".nuxt", ".output"],
  },
  {
    rules: {
      "@stylistic/semi": ["error", "never"],
      "@stylistic/quotes": ["error", "double"],
      "@stylistic/indent": ["error", 2],
      "@stylistic/comma-dangle": ["error", "always-multiline"],
      "prettier/prettier": "error",
    },
    extends: ["plugin:prettier/recommended"],
  }
)
