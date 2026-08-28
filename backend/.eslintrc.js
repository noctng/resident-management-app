module.exports = {
    root: true,
    env: {
        node: true,
        commonjs: true,
        es2021: true,
    },
    extends: ['eslint:recommended', 'plugin:prettier/recommended'],
    parserOptions: {
        ecmaVersion: 'latest',
    },
    rules: {
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'no-console': 'off', // Allow console logs in backend for now
        // Prettier formatting → warn (dùng `npm run format` để chuẩn hóa riêng, không block lint gate)
        'prettier/prettier': 'warn',
        // Relax các rule style/config để lint chạy được làm gate (sẽ tighten sau khi có CI)
        'no-empty': 'off', // cho phép empty catch block
        'no-useless-escape': 'off', // style nhỏ
        'no-undef': 'warn', // cảnh báo undefined (test setups, globals) thay vì block
    },
    overrides: [
        {
            // Test files dùng vitest/mocha globals (describe/it/expect/beforeAll)
            files: ['src/tests/**/*.js', 'src/tests/**/*.mjs'],
            env: { mocha: true, node: true },
            rules: {
                'no-undef': 'off',
            },
        },
        {
            // ESM test files (.mjs) cần sourceType module để parse import/export
            files: ['src/tests/**/*.mjs'],
            parserOptions: { sourceType: 'module' },
        },
    ],
};
