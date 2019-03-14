const fs = require('fs');
const mbr = require('mbr');

exports.storeFilesInOutputImage = storeFilesInOutputImage;

function storeFilesInOutputImage(imgOutput, files) {

	let fileSizes = files.map(f => fs.statSync(f).size);

	// TODO: check space on local disk for output image
	// TODO: check size of sdcard

	fs.open(imgOutput, fs.constants.O_RDWR,
		function (error, fd) {
			let dataOffsets = createPartitionWithFilesystem(fd, 2, fileSizes);
			if (dataOffsets === false) {
				return false;
			}

			fs.closeSync(fd);

			for (let i = 0; i < files.length; i++) {
				// Write file
				fs.createReadStream(files[i]).pipe(fs.createWriteStream(imgOutput, {flags: 'r+', start: dataOffsets[i]}));
			}
		}
	);	
}


function createPartitionWithFilesystem(fd, partitionNumber, dataEntrySizes) {

	const roundSize = 4 * 1024 * 1024;

	const fsPrefix = new Buffer("BROWNIE1");

	// Determine needed partition size
	let fsHeaderLength = fsPrefix.length + 8 + (2 * 8 * dataEntrySizes.length);
	let partitionSize = fsHeaderLength + dataEntrySizes.reduce((a, b) => a + b, 0);

	// Read existing mbr
	let buf = Buffer.alloc(512);
	let read = fs.readSync(fd, buf, 0, 512, 0);
	let m = new mbr(buf);

	if (m.partitions[2].type !== 0) {
		console.log("Partition 2 already exists. Template file invalid.");
		return false;
	}

	// Round needed partition size
	let roundedSize = Math.ceil(partitionSize / roundSize) * roundSize;
	let sectors = roundedSize / 512;

	// Find free sector at the end
	var firstFreeSector = 0;
	for (let i = 0; i < m.partitions.length; i++) {
		let p = m.partitions[i];
		if (p.firstLBA + p.sectors > firstFreeSector) {
			firstFreeSector = p.firstLBA + p.sectors;
		}
	}
	m.partitions[partitionNumber].firstLBA = firstFreeSector;
	m.partitions[partitionNumber].sectors = sectors;
	m.partitions[partitionNumber].type = 0x7f;

	// Write mbr
	fs.writeSync(fd, m.buffer, 0, 512, 0);

	let fsStart = firstFreeSector * 512;
	let dataOffsets = [];

	let tmpBuf = new Buffer(8);

	// Write FS prefix
	fs.writeSync(fd, fsPrefix, 0, 8, fsStart + 0x00);

	// Write number of entries
	intTo64BitBuffer(tmpBuf, dataEntrySizes.length);
	fs.writeSync(fd, tmpBuf, 0, 8, fsStart + 0x08);

	// Writer index (length + offset)
	// fsNextData: relative to partition begin
	let fsNextData = fsHeaderLength; 
	for (let i = 0; i < dataEntrySizes.length; i++) {
		intTo64BitBuffer(tmpBuf, fsNextData);
		fs.writeSync(fd, tmpBuf, 0, 8, fsStart + 0x10 + (i * 2 * 8));
		intTo64BitBuffer(tmpBuf, dataEntrySizes[i]);
		fs.writeSync(fd, tmpBuf, 0, 8, fsStart + 0x10 + (i * 2 * 8) + 0x08);
		dataOffsets.push(fsStart + fsNextData);
		fsNextData = fsNextData + dataEntrySizes[i];
	}

	// Returned offsets are relative to complete image file!
	return dataOffsets;
}

function intTo64BitBuffer(buf, v) {
	// simulate writeUInt64LE
	// TODO: check if this really works with video files > 4 GB
	buf.writeUInt32LE(v & 0xffffffff00000000, 4);
	buf.writeUInt32LE(v & 0x00000000ffffffff, 0);
}

