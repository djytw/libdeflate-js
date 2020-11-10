import {LibDeflate, DecompressorResult, LibDeflateCompressor, LibDeflateDecompressor} from '../libdeflate.js';

// nodejs main entry
if (require != undefined && require.main === module) {
    node_main(process);
}

function node_main(process: NodeJS.Process) : Promise<void> {
    return new Promise(async resolve => {

        const fs = require("fs");
        const path = require("path");
        if (process.argv.length < 3) {
            console.log(`Usage: node ${path.relative(process.cwd(), process.argv[1])} <file>`);
            process.exit(-1);
        }
    
        let file = process.argv[2];
        let data = fs.readFileSync(file);
        if (data.constructor !== Buffer) {
            console.log(`Read file ${file} failed.`);
            process.exit(-1);
        }
    
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

    });
}


function gzip(data: Uint8Array) : Promise<Uint8Array> {

    return new Promise(async resolve => {

        let compressor = new LibDeflateCompressor(12);

        let output_bound = compressor.gzip_bound(data.byteLength);
        let output_buffer = new Uint8Array(output_bound);
    
        let output_size = await compressor.gzip_compress(data, output_buffer);
        
        if (output_size == 0) {
            // This is unlikely to happen, though
            throw 'gzip failed.';
        }

        let output_data = output_buffer.slice(0, output_size);
    
        resolve(output_data);

    })
}

function ungzip(data: Uint8Array) : Promise<Uint8Array> {

    return new Promise(async resolve => {
    
        let decompressor = new LibDeflateDecompressor();

        // Assumes uncompressed data is smaller than 16MB
        let output_bound = 1 << 24;
        let output_buffer = new Uint8Array(output_bound);
    
        let [result, consumed_size, output_size] = await decompressor.gzip_decompress_ex(data, output_buffer);
        if (result == DecompressorResult.LIBDEFLATE_BAD_DATA) {
            throw 'The input is not a valid gzip file.';
        }
        if (result == DecompressorResult.LIBDEFLATE_INSUFFICIENT_SPACE) {
            throw 'The basic example only supports a maximum of 16MB of uncompressed data.';
        }
        if (result != DecompressorResult.LIBDEFLATE_SUCCESS) {
            throw 'Internal error';
        }

        let output_data = output_buffer.slice(0, output_size);
    
        resolve(output_data);

    })
}

function decimalToHexString(number: number) : string {
    if (number < 0) {
        number += 1<<32;
    }
    return number.toString(16).toUpperCase();
}
