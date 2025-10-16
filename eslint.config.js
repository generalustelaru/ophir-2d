import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
    {
        ignores: ['public/**', '**/*_constants.ts'],
    },
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parser: tsParser,
            globals: {
                // ES2021 globals
            },
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
        },
        rules: {
            'quotes': ['error', 'single'],
            'semi': ['error', 'always'],
            'max-len': ['warn', { code: 125 }],
            'object-curly-spacing': ['error', 'always'],
            'array-bracket-spacing': ['error', 'never'],
            'comma-dangle': ['error', 'always-multiline'],
            'indent': ['error', 4, { 'SwitchCase': 1 }],
        },
    },
    {
        files: ['src/client/**/*.ts'],
        languageOptions: {
            globals: { window: 'readonly', document: 'readonly' },
        },
    },
    {
        files: ['src/server/**/*.ts'],
        languageOptions: {
            globals: { process: 'readonly', __dirname: 'readonly' },
        },
    }];