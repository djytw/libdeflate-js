import LibDeflate from '../libdeflate.js';

// nodejs main entry
if (process != undefined) {
    (async () => {
        let path = await import('path');
        let url = await import('url');
        if (path.resolve(process.argv[1]) === url.fileURLToPath(import.meta.url)) {
            node_main(process);
        }
    })()
}

function node_main(process: NodeJS.Process) : Promise<void> {
    return new Promise(async resolve => {

        const fs = await import("fs");
        const path = await import("path");
        if (process.argv.length < 3) {
            console.log(`Usage: node ${path.relative(process.cwd(), process.argv[1])} <file>`);
            process.exit(-1);
        }
    
        let file = process.argv[2];
        let _data = fs.readFileSync(file);
        if (_data.constructor !== Buffer) {
            console.log(`Read file ${file} failed.`);
            process.exit(-1);
        }
        let data = new Uint8Array(_data);
    
        await LibDeflate.initialize();

        let crc = decimalToHexString(LibDeflate.crc32(data));
        console.log(`Read input file ${file} ok, size=${data.byteLength} bytes, CRC-32=${crc}`);
    
        let gzipped = await gzip(data);
        console.log(`Gzip finished, compressed file size=${gzipped.byteLength} bytes`);
        fs.writeFileSync(file + ".gz", gzipped);
    
        let ungzipped = await ungzip(gzipped);
        let new_crc = decimalToHexString(LibDeflate.crc32(ungzipped));
        console.log(`Ungzip finished, uncompressed file size=${ungzipped.byteLength} bytes, CRC-32=${new_crc}`);
    
        if (new_crc === crc) {
            console.log("\x1b[32mCRC-32 matched!\x1b[0m");
        } else {
            console.log("\x1b[31mCRC-32 mismatch!\x1b[0m");
        }

        resolve();
    });
}


function gzip(data: Uint8Array) : Promise<Uint8Array> {

    return new Promise(async resolve => {

        let compressor = new LibDeflate.Compressor(12);

        let output_bound = compressor.gzip_bound(data.byteLength);
        let output_buffer = new Uint8Array(output_bound);
    
        let output_size = await compressor.gzip_compress(data, output_buffer);
        
        if (output_size == 0) {
            // This is unlikely to happen, though
            throw 'gzip failed.';
        }

        let output_data = output_buffer.slice(0, output_size);
    
        compressor.close();

        resolve(output_data);

    })
}

function ungzip(data: Uint8Array) : Promise<Uint8Array> {

    return new Promise(async resolve => {
    
        let decompressor = new LibDeflate.Decompressor();

        // Assumes uncompressed data is smaller than 1MB
        let output_bound = 1 << 16;
        let output_buffer = new Uint8Array(output_bound);
    
        let [result, output_size] = await decompressor.gzip_decompress(data, output_buffer);
        if (result == LibDeflate.DecompressorResult.LIBDEFLATE_BAD_DATA) {
            throw 'The input is not a valid gzip file.';
        }
        if (result == LibDeflate.DecompressorResult.LIBDEFLATE_INSUFFICIENT_SPACE) {
            throw 'The basic example only supports a maximum of 1MB of uncompressed data.';
        }
        if (result != LibDeflate.DecompressorResult.LIBDEFLATE_SUCCESS) {
            throw 'Internal error';
        }

        let output_data = output_buffer.slice(0, output_size);
    
        resolve(output_data);

    })
}

function decimalToHexString(number: number) : string {
    if (number < 0) {
        number = number + 0xffffffff + 1;
    }
    return number.toString(16).toUpperCase();
}
