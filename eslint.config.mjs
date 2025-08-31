import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**", 
      "build/**",
      "dist/**",
      "coverage/**",
      "next-env.d.ts",
      "*.min.js",
      "public/**",
      "prisma/migrations/**",
      "supabase/migrations/**",
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      // TypeScript specific rules
      "@typescript-eslint/no-unused-vars": ["error", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-inferrable-types": "error",
      
      // Code quality
      "prefer-const": "error",
      "no-var": "error",
      "no-console": ["warn", { "allow": ["warn", "error"] }],
      "no-debugger": "error",
      "no-alert": "error",
      
      // String and escaping rules
      "no-useless-escape": "error",
      
      // React/Next.js specific
      "react/no-unescaped-entities": "error",
      "react/jsx-key": "error",
      "react/jsx-no-duplicate-props": "error",
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      
      // Next.js specific
      "@next/next/no-img-element": "error",
      "@next/next/no-html-link-for-pages": "error",
    },
  },
  // Config files exceptions
  {
    files: ["*.config.{js,ts,mjs}", "*.setup.{js,ts}", "jest.config.js"],
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Test files exceptions
  {
    files: ["**/__tests__/**/*", "**/*.test.*", "**/*.spec.*", "tests/**/*"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-require-imports": "off",
      "no-console": "off",
    },
  },
  // tRPC routers exceptions
  {
    files: ["src/server/api/**/*"],
    rules: {
      "@typescript-eslint/require-await": "off",
    },
  },
];

export default eslintConfig;