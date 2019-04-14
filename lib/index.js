const fs = require('fs');
const path = require('path');
const mbr = require('mbr');
const EventEmitter = require('events').EventEmitter;
const tmp = require('tmp');
const imageWrite = require('etcher-image-write');
const ext2 = require('brownie-ext2creator');

const imgTemplate = path.resolve('resources/template.img');

const fsPrefix = "BROWNIE1";

// Min partition size / partition boundaries at 4 MB
const roundSize = 4 * 1024 * 1024;

exports.writeVideoPlayer = writeVideoPlayer;

function writeVideoPlayer (physicalDrive, videoFile) {
	const emitter = new EventEmitter();

	emitter.emit('progress', {'statusText': 'Copying template image...'});

	let tmpFile = tmp.fileSync();

	fs.copyFile(imgTemplate, tmpFile.name, (error) => {

		if (error) {
			throw error;
		}
		emitter.emit('progress', {'statusText': 'Writing configuration and video files to image...'});
		let files = [
			path.resolve('resources/autostart_scripts/play_single_video.sh'),
			videoFile
		];
		storeFilesInOutputImage(tmpFile.name, files, function(tmpImageFile) {
			emitter.emit('progress', {'statusText': 'Done creating output.img...'});
			var writer = imageWrite.write({
				fd: fs.openSync(physicalDrive, 'rs+'),
				device: physicalDrive,
				size: 4017094656 // TODO: read actual size
			}, {
				stream: fs.createReadStream(tmpImageFile),
				size: fs.statSync(tmpImageFile).size
			}, {
				check: false
			});
			writer.on('progress', (state) => {
				emitter.emit('progress', {'statusText': 'Writing image: ' + Math.round(state.percentage) + ' %...'});
			});

		});


	});

	return emitter;
}

function getFsHeaderLength(fileSizes) {
	return fsPrefix.length + 8 + (2 * 8 * fileSizes.length);
}

function getFsSize(fileSizes, round = false) {
	let fsSize = getFsHeaderLength(fileSizes) + fileSizes.reduce((a, b) => a + b, 0);
	if (round) {
		let roundedSize = Math.ceil(fsSize / roundSize) * roundSize;
	}
	else {
		return fsSize;
	}
}

function storeFilesInOutputImage(imgOutput, files, callback) {

	let fileSizes = files.map(f => fs.statSync(f).size);
	// TODO: exception file does not exist
	// TODO: check space on local disk for output image
	// TODO: check size of sdcard

	fs.open(imgOutput, fs.constants.O_RDWR,
		function (error, fd) {

			// TODO: Exception handling (error)

			const fsSize = 32 * 1024 * 1024;

			// Create partition
			// const partitionStart = createPartition(fd, 2, getFsSize(fileSizes));
			const partitionStart = createPartition(fd, 2, fsSize);
			if (partitionStart === false) {
				// TODO: Exception handling
				console.log("Unable to write partition to image.");
				return false;
			}

			const f = ext2.initExt2(fd, fsSize, 1024, {offset: partitionStart, volumeName: 'brownie'});
                        (async () => {
                                ext2.createDirectory(f, "/brownieplayer", {uid: 1000, gid: 1000, accessRights: 0755});
				const file = path.resolve('resources/autostart_scripts/reboot_loop.sh');
				await ext2.writeFileFromHostFileSystem(f, '/brownieplayer/start.sh', file);
				// TODO: write media file too
				fs.closeSync(fd)
				callback(imgOutput);
			})();

		}
	);
}

function createPartition(fd, partitionNumber, partitionSize) {

	// Read existing mbr
	let buf = Buffer.alloc(512);
	let read = fs.readSync(fd, buf, 0, 512, 0);
	let m = new mbr(buf);

	if (m.partitions[2].type !== 0) {
		// TODO: Exception handling
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
	m.partitions[partitionNumber].type = 0x83;

	// Write mbr
	fs.writeSync(fd, m.buffer, 0, 512, 0);

	return firstFreeSector * 512;
}

