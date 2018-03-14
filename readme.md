# hideous

hotplug for [node-hid](https://www.npmjs.com/package/node-hid).

## usage

``` javascript

var hideous = require("hideous");

hideous({

	// scan for new devices
	scan: true,

	// poll interval for scans
	interval: "10s",

	// connect to discovered devices
	attach: true,

	// filter devices by properties from `node-hid`
	filter: {
		vendorId: 1452,
		productId: 610,
		path: /Keyboard/, // can be regular expresson for string values
		serialNumber: '',
		manufacturer: /Apple/,
		product: 'Apple Internal Keyboard / Trackpad',
		release: 549,
		interface: -1,
		usagePage: 1,
		usage: 6 },
	}

}).on("connect", function(device){

	console.log("connect");

}).on("disconnect", function(device){

	console.log("disconnect");

}).on("attach", function(connection, device){

	console.log("attach");

	// connection is a `node-hid.HID` instance
	connection.on("data", function(data){
		console.log("data", data);
	});
	
}).on("detach", function(connection, device){
	console.log("detach");
});

```