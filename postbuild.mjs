import fs from 'fs';

fs.copyFile('build/libdeflate.d.ts', 'dist/libdeflate.d.ts', err => {
    if (err) throw err;
    console.log('Copied libdeflate.d.ts');
})

let rmfunc = fs.rm; //node v14+
if (rmfunc === undefined) {
    rmfunc = fs.rmdir;
}
rmfunc('build', {recursive: true, force: true}, err => {
    if (err) throw err;
    console.log('Cleaned build directory');
});