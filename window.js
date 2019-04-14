let path = require('path');

const $ = require('jquery');
const fs = require('fs');
const brownieFs = require(path.resolve('lib/index'));
const imageWrite = require('etcher-image-write');
const drivelist = require('drivelist');
const tmp = require('tmp');

const imgTemplate = 'template.img';
// const imgOutput = 'output.img';


$(() => {

	drivelist.list((error, drives) => {
		if (error) {
			console.log(error);
			throw error;
		}

		$.each(drives, (idx, d) => {
			console.log(d);
			if (d.isRemovable) {
				let o = $('<option></option>').attr('value', d.device).text(d.device + " (" + Math.floor(100 * d.size / 1024 / 1024 / 1024) / 100 + " GB)").appendTo('#device');
			}
		});
	});


	$('#write').bind('click', () => {

		let files = [
			'autostart_scripts/play_single_video.sh',
			$('#filename').val(),
		];

		$('#status').text('Copying template image...');

		let tmpFile = tmp.fileSync();

		fs.copyFile(imgTemplate, tmpFile.name, (error) => {

			if (error) {
				throw error;
			}

			$('#status').text('Writing configuration and video files to image...');
			brownieFs.storeFilesInOutputImage(tmpFile.name, files);
			$('#status').text('Done creating output.img...');


		});
	
	});

});
