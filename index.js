const v4l2camera = require("v4l2camera");
const Jpeg = require('libjpeg').Jpeg;

const cam = new v4l2camera.Camera("/dev/video0");
cam.configSet({width: 640, height: 480, interval: {numerator: 2, denominator: 15}});


const format = cam.configGet();

const width = 1*format.width;
const height = 1*format.height;

const interval = (format.interval.numerator / format.interval.denominator) * 1000;
console.log('interval', interval);

const express = require('express')
const app = express()

const responses = [];

var boundaryID = 'BOUNDARY';


var capturing = false;
var started = false;
setInterval(function(){

	if(responses.length <= 0){
		if(started){
			console.log('closing');
			cam.stop(function(){
				started = false;
				console.log('closed');
			});
		}
		return;
	}

	if(capturing){
		console.log("already capturing");
		return;
	}

	if(!started){
		cam.start();
		started = true;
	}

//	console.log('trying capture');
	cam.capture(function (success) {
//		console.log('have capture');
		var start = new Date();	
		//var frame = cam.frameRaw();
		const pixels = new Buffer(cam.toRGB());

//		console.log('got frame', new Date() - start);
		
		var jpeg = new Jpeg(pixels, width, height);
		
		data = jpeg.encodeSync().toString('binary');
//		console.log('jpeg data', new Date() -start);

		for(key in responses){
//			console.log('writing to response');
			var res = responses[key];
			res.write('--' + boundaryID + '\r\n')
			res.write('Content-Type: image/jpeg\r\n');
			res.write('Content-Length: ' + data.length + '\r\n');
			res.write("\r\n");
			res.write(data, 'binary');
			res.write("\r\n");
//			console.log('written to response');
		}
		
//		console.log('sent response');
		capturing = false;
	});
	capturing = true;
//	console.log('done trying to capture');
}, interval);

			
	
app.get('/stream.jpg', (req, res) => {

	console.log('got request');

	responses.push(res);
	
	res.on('close', function() {

		var index = responses.indexOf(res);
		console.log('removing index', index);
		responses.splice(index);
		console.log("Connection closed!");
		res.end();
		
	});
	
	res.writeHead(200, {
		'Content-Type': 'multipart/x-mixed-replace;boundary="' + boundaryID + '"',
		'Connection': 'keep-alive',
		'Expires': 'Fri, 27 May 1977 00:00:00 GMT',
		'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
		'Pragma': 'no-cache'
	});

});

app.listen(3000, () => console.log('Example app listening on port 3000!'))

