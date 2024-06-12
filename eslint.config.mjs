import antfu from "@antfu/eslint-config";

export default antfu({
  stylistic: {
    quotes: "double",
    semi: true,
  },
  formatters: true,
  typescript: true,
  // react: true,
});
