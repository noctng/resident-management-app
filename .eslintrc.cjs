module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:prettier/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      // UI kit là vùng chuẩn của design system — cấm tuyệt đối native dialog
      files: ['src/components/ui/**/*.tsx'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: "CallExpression[callee.name='alert']",
            message: 'Cấm alert() — dùng useToast() từ src/components/ui',
          },
          {
            selector:
              "CallExpression[callee.object.name='window'][callee.property.name=/^(alert|confirm|prompt)$/",
            message: 'Cấm window.alert/confirm/prompt — dùng useToast()/useConfirm()',
          },
        ],
      },
    },
  ],
};
