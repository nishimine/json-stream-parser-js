const js = require('@eslint/js');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');
const globals = require('globals');

module.exports = [
    js.configs.recommended,
    {
        plugins: {
            prettier: prettierPlugin,
        },
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                ...globals.node,
                ...globals.es2020,
            },
        },
        rules: {
            // Prettierと統合（.prettierrc.jsonから設定を読み込む）
            'prettier/prettier': 'error',

            // Prettierと競合しないルール
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-console': 'off',
            'prefer-const': 'error',
            'no-var': 'error',
            eqeqeq: ['error', 'always'],
            'no-useless-escape': 'off',

            // 追加の厳格なルール
            'no-duplicate-imports': 'error',
            'no-self-compare': 'error',
            'no-unneeded-ternary': 'error',
            'no-useless-return': 'error',
            'prefer-template': 'error',
            yoda: ['error', 'never'],
            'no-magic-numbers': [
                'warn',
                {
                    ignore: [-3, -2, -1, 0, 1, 2, 3, 10, 100, 1000, 1024],
                    ignoreArrayIndexes: true,
                    ignoreDefaultValues: true,
                },
            ],
            complexity: ['warn', 20],
            'max-depth': ['warn', 4],
            'max-lines-per-function': [
                'warn',
                { max: 100, skipBlankLines: true, skipComments: true },
            ],
            'max-params': ['warn', 5],
            'consistent-return': 'error',
            'default-case': 'error',
            'dot-notation': 'error',
            'guard-for-in': 'error',
            'no-alert': 'error',
            'no-caller': 'error',
            'no-eval': 'error',
            'no-extend-native': 'error',
            'no-extra-bind': 'error',
            'no-implicit-coercion': 'error',
            'no-implied-eval': 'error',
            'no-iterator': 'error',
            'no-labels': 'error',
            'no-lone-blocks': 'error',
            'no-loop-func': 'error',
            'no-new': 'error',
            'no-new-func': 'error',
            'no-new-wrappers': 'error',
            'no-octal-escape': 'error',
            'no-proto': 'error',
            'no-return-assign': 'error',
            'no-script-url': 'error',
            'no-sequences': 'error',
            'no-throw-literal': 'error',
            'no-unused-expressions': 'error',
            'no-useless-call': 'error',
            'no-useless-concat': 'error',
            'no-void': 'error',
            'no-with': 'error',
            'wrap-iife': ['error', 'inside'],

            // Prettierと競合するルールを無効化
            ...prettierConfig.rules,
        },
    },
    // テストファイル用の設定
    {
        files: ['test/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.es2020,
                ...globals.jest,
            },
        },
        rules: {
            // テストファイルでは長い関数を許容
            'max-lines-per-function': [
                'warn',
                { max: 400, skipBlankLines: true, skipComments: true },
            ],
            // テストデータのマジックナンバーを許容
            'no-magic-numbers': 'off',
        },
    },
    {
        ignores: [
            'node_modules/',
            'debug/',
            'debug_*.js',
            '*.min.js',
            '*.d.ts',
            'coverage/',
            'dist/',
            '.github/',
            'doc/',
        ],
    },
];
