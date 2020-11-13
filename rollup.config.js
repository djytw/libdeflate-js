export default [
    {
        input: 'build/libdeflate.js',
        output: {
            file: 'dist/libdeflate.module.js',
            format: 'esm'
        },
        external: ['path', 'fs', 'url']
    },
    {
        input: 'build/libdeflate.js',
        output: {
            file: 'dist/libdeflate.js',
            format: 'umd',
            name: 'LibDeflate',
            exports: 'named'
        },
        external: ['path', 'fs', 'url']
    },
];