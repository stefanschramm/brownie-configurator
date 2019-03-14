#!/usr/bin/env node

const fs = require('fs');
const brownieFsCreate = require('../lib/index');
const imageWrite = require('etcher-image-write');

const imgTemplate = 'template.img';
const imgOutput = 'output.img';
const physicalDrive = '/dev/mmcblk0';

fs.copyFileSync(imgTemplate, imgOutput);

// TODO: integrity check for template / copied template?

// TODO: check space on local disk for template image copy

let files = [
	'autostart_scripts/play_single_video.sh',
	'example.mp4'
];

brownieFsCreate.storeFilesInOutputImage(imgOutput, files);

var emitter = imageWrite.write({
	fd: fs.openSync('/dev/mmcblk0', 'rs+'), // '\\\\.\\PHYSICALDRIVE1' in Windows, for example.
	device: '/dev/mmcblk0',
	size: 4017094656 // TODO: read
}, {
	stream: fs.createReadStream(imgOutput),
	size: fs.statSync(imgOutput).size
}, {
	check: true
});

emitter.on('progress', (state) => {
	console.log(state);
});

emitter.on('error', (error) => {
	console.error(error);
});

emitter.on('done', (results) => {
	console.log('Success!');
});

