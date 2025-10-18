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
            'quotes': ['warn', 'single'],
            'semi': ['warn', 'always'],
            'max-len': ['warn', { code: 125 }],
            'object-curly-spacing': ['warn', 'always'],
            'array-bracket-spacing': ['warn', 'never'],
            'comma-dangle': ['warn', 'always-multiline'],
            'indent': ['warn', 4, { 'SwitchCase': 1 }],
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