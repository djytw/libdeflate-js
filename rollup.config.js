
let files = ['libdeflate', 'example/basic'];

let result = [];

for (let file of files) {
    result.push({
        input: `build/${file}.js`,
        output: {
            file: `dist/${file}.module.js`,
            format: 'esm'
        },
        external: ['path', 'fs', 'url']
    });
    result.push({
        input: `build/${file}.js`,
        output: {
            file: `dist/${file}.js`,
            format: 'es',
            exports: 'named'
        },
        external: ['path', 'fs', 'url']
    });
}

export default result;
