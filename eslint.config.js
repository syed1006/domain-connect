// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.strict,
    tseslint.configs.stylistic,
    {
        rules: {
            "@typescript-eslint/array-type": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-useless-constructor": "off",
            "@typescript-eslint/no-inferrable-types": "off",
            "@typescript-eslint/no-explicit-any": "warn",
        },
    },
);
