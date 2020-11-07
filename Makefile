all:
	cd libdeflate; emmake make
	emcc libdeflate/libdeflate.a -s EXPORTED_FUNCTIONS="[\
		'_libdeflate_alloc_compressor', \
		'_libdeflate_deflate_compress', \
		'_libdeflate_deflate_compress_bound', \
		'_libdeflate_zlib_compress', \
		'_libdeflate_zlib_compress_bound', \
		'_libdeflate_gzip_compress', \
		'_libdeflate_gzip_compress_bound', \
		'_libdeflate_free_compressor', \
		'_libdeflate_alloc_decompressor', \
		'_libdeflate_deflate_decompress', \
		'_libdeflate_deflate_decompress_ex', \
		'_libdeflate_zlib_decompress', \
		'_libdeflate_zlib_decompress_ex', \
		'_libdeflate_gzip_decompress', \
		'_libdeflate_gzip_decompress_ex', \
		'_libdeflate_free_decompressor', \
		'_libdeflate_adler32', \
		'_libdeflate_crc32' \
	]" -o libdeflate.wasm

clean:
	cd libdeflate; make clean; rm -f gzip.wasm
	rm -f libdeflate.wasm
