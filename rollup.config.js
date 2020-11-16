import path from 'path';
import replace from '@rollup/plugin-replace';

let files = [
    ['libdeflate', 'LibDeflate'], 
    ['example/basic', 'ExampleBasic'],
];

let importpath = path.join(__dirname, 'build/libdeflate');

let nodemain_cjs = classname => `
if (require !== undefined && require.main === module) {
    ${classname}.node_main(process);
}`;

let nodemain_mjs = classname => `
if (process != undefined) {
    (async () => {
        let path = await import('path');
        let url = await import('url');
        if (path.resolve(process.argv[1]) === url.fileURLToPath(import.meta.url)) {
            ${classname}.node_main(process);
        }
    })()
}`;

let internal_footer = footer => ({
    transform: (code, id) => {
        if (id == importpath + ".js") {
            return null;
        }
        return code + footer;
    }
})

let result = [];

for (const [file, classname] of files) {
    result.push({
        input: `build/${file}.js`,
        output: {
            file: `dist/${file}.mjs`,
            format: 'esm',
            paths: { [importpath] : '../libdeflate.mjs' },
        },
        plugins:[
            replace({
                'require': 'await import',
                '__dirname': 'path.dirname((await import(\'url\')).fileURLToPath(import.meta.url))'
            }),
            internal_footer(nodemain_mjs(classname)),
        ],
        external: ['path', 'fs', 'url', '../libdeflate']
    });
    result.push({
        input: `build/${file}.js`,
        output: {
            file: `dist/${file}.js`,
            format: 'umd',
            exports: 'default',
            name: classname,
            paths: { [importpath] : '../libdeflate.js' },
            globals: { [importpath] : 'LibDeflate' },
        },
        plugins:[
            internal_footer(nodemain_cjs(classname)),
        ],
        external: ['path', 'fs', 'url', '../libdeflate']
    });
}

export default result;
