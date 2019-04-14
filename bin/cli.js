#!/usr/bin/env node

const fs = require('fs');
const brownieFs = require('../lib/index');
const imageWrite = require('etcher-image-write');
const drivelist = require('drivelist');

const imgTemplate = 'template.img';
const imgOutput = 'output.img';
const physicalDrive = '/dev/mmcblk0';

let emitter = brownieFs.writeVideoPlayer(physicalDrive, 'example.mp4');

emitter.on('progress', state => {
	console.log(state.statusText);
});

/*
drivelist.list((error, drives) => {
  if (error) {
    console.log(error);
    throw error;
  }

  console.log(drives);
});
*/

/*

fs.copyFileSync(imgTemplate, imgOutput);

// TODO: integrity check for template / copied template?

// TODO: check space on local disk for template image copy + output image

let files = [
	'autostart_scripts/play_single_video.sh',
	'example.mp4'
];

brownieFs.storeFilesInOutputImage(imgOutput, files);

// TODO: check size of sdcard

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

*/
