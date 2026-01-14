import jsLint from '@eslint/js';
import vuePlugin from 'eslint-plugin-vue';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import vueParser from 'vue-eslint-parser';
import globals from 'globals';
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt(
    [
        // JS Recommended
        jsLint.configs.recommended,
       
        // TypeScript 設定
        {
            files: ['**/*.ts', '**/*.tsx'],
            languageOptions: { parser: tsParser },
            plugins: { '@typescript-eslint': tsPlugin },
            rules: {
                '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
                '@typescript-eslint/no-namespace': 'off',
            },
        },
       
        // Vue SFC
        {
            files: ['*.vue', '**/*.vue'],
            languageOptions: {
                parser: vueParser,
                parserOptions: { parser: tsParser },
            },
            plugins: { vue: vuePlugin },
            rules: {
                'vue/html-indent': [
                    'error',
                    4,
                    {
                        attribute: 1,
                        alignAttributesVertically: true,
                    },
                ],
                'vue/max-attributes-per-line': [
                    'error', {
                        singleline: { max: 2 },
                        multiline: { max: 1 },
                    },
                ],
                'vue/html-closing-bracket-newline': [
                    'error', {
                        singleline: 'never',
                        multiline: 'always',
                    },
                ],
                'vue/multi-word-component-names': 'off',
                'vue/html-self-closing': [
                    'error', {
                        html: {
                            void: 'never',
                            normal: 'always',
                            component: 'always',
                        },
                        svg: 'always',
                        math: 'always',
                    },
                ],
            },
        },
       
        // 全域規則
        {
            files: ['**/*.{js,ts}'],
            rules: {
                indent: ['error', 4],
                quotes: ['error', 'single'],
                semi: ['error', 'always'],
                'comma-dangle': ['error', 'always-multiline'],
                'no-multiple-empty-lines': ['error', { max: 1 }],
                'object-curly-spacing': ['error', 'always'],
                'object-curly-newline': [
                    'error', {
                        multiline: true,
                        minProperties: 2,
                    },
                ],
                'array-bracket-newline': [
                    'error', {
                        multiline: true,
                        minItems: 3,
                    },
                ],
                'array-element-newline': ['error', { minItems: 3 }],
            },
        },
       
        // 忽略檔案
        {
            ignores: [
                'dist/*',
                '.nuxt/*',
                'node_modules/*',
                '**/*.d.ts',
            ], 
        },
       
        // 全域 env
        {
            languageOptions: {
                globals: {
                    ...globals.browser,
                    ...globals.node,
                    useHead: 'readonly',
                    useRuntimeConfig: 'readonly',
                    useRoute: 'readonly',
                    useRouter: 'readonly',
                    useState: 'readonly',
                    useFetch: 'readonly',
                    useLazyFetch: 'readonly',
                    useAsyncData: 'readonly',
                    defineNuxtComponent: 'readonly',
                    definePageMeta: 'readonly',
                },
            },
        },
    ],
);
