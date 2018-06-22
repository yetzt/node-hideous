#!/usr/bin/env node

var util = require("util");
var hid = require("node-hid");
var dur = require("dur");
var debug = require("debug")("hideous");

function hideous(config){
	return (this instanceof hideous) ? this.start(config || {}) : new hideous(config);
};

util.inherits(hideous, require("events").EventEmitter);

// nice short string for device
hideous.prototype.format = function(d){
	return util.format("%s-%s:%s:%s:%s", d.path.split('/').pop(), d.vendorId.toString(16), d.productId.toString(16), (d.usage||0).toString(16), (d.usagePage||0).toString(16));
};

// initialize
hideous.prototype.start = function(config){
	var self = this;
	
	// config
	self.config = {};
	self.config.filter = (config.filter || null);
	self.config.interval = dur(config.interval || 1000);
	self.config.scan = (!!config.scan); // scan for devices
	self.config.attach = (!!config.attach); // discover devices
	
	// discovered devices
	self.devices = {};

	// attached devices
	self.attached = {};

	self.on("connect", function(d){
		debug("<discovered> %s", self.format(d));
		if (self.config.attach) self.attach(d);
	});

	self.on("disconnect", function(d){
		debug("<lost> %s", self.format(d));
		if (self.config.attach) self.detach(d);
	});
	
	self.on("attach", function(c,d){
		debug("<attach> %s", self.format(d));
	});
	
	self.on("detach", function(c,d){
		debug("<detach> %s", self.format(d));
	});
	
	if (self.config.scan) {
		setImmediate(function(){ self.scan(); });
		self.scanner = setInterval(function(){ self.scan(); }, self.config.interval);
	}
	
	return this;
};

// end scans and detach all devices
hideous.prototype.end = function(){
	var self = this;

	// clear interval 
	if (self.scanner) clearInterval(self.scanner);

	// detach all devices
	Object.keys(self.attached).forEach(function(d){
		self.detach(d);
	});

	return this;
};

// attac device
hideous.prototype.attach = function(d, fn){
	var self = this;
	
	try {

		self.attach[d.path] = new hid.HID(d.path);
		
		self.attach[d.path].on("error", function(err){
			debug("<device-err> dropping %s due to err %s", self.format(d), err);
			self.emit("detach", self.attach[d.path], d);
			delete self.attach[d.path];
			delete self.devices[d.path];
		});

	} catch (err) {

		debug("<attach-err> [%s] %s", self.format(d), err);
		if (fn) fn(err);
		return this;
	}

	self.emit("attach", self.attach[d.path], d);
	if (fn) fn(null, self.attach[d.path]);
	
	return this;
};

// detach device
hideous.prototype.detach = function(d){
	var self = this;

	try {

		self.attach[d.path].close();
		self.emit("detach", self.attach[d.path], d);
		delete self.attach[d.path];

	} catch (err) {
		debug("<detach-err> [%s] %s", self.format(d), err);
	}

	return this;
};

// scan for devices
hideous.prototype.scan = function(fn){
	var self = this;
	
	try {
	
		// get all devices
		var devices = hid.devices().filter(function(d){
			return (!self.config.filter || (
				(!self.config.filter.path || ((self.config.filter.path instanceof RegExp) && self.config.filter.path.test(d.path)) || d.path === self.config.filter.path)
				&& 
				(!self.config.filter.vendorId || d.vendorId === self.config.filter.vendorId)
				&&
				(!self.config.filter.productId || d.productId === self.config.filter.productId)
				&& 
				(!self.config.filter.usage || d.usage === self.config.filter.usage)
				&& 
				(!self.config.filter.usagePage || d.usagePage === self.config.filter.usagePage)
				&& 
				(!self.config.filter.release || d.release === self.config.filter.release)
				&& 
				(!self.config.filter.interface || d.interface === self.config.filter.interface)
				&&
				(!self.config.filter.product || ((self.config.filter.product instanceof RegExp) && self.config.filter.product.test(d.product)) || d.product === self.config.filter.product)
				&&
				(!self.config.filter.manufacturer || ((self.config.filter.manufacturer instanceof RegExp) && self.config.filter.manufacturer.test(d.manufacturer)) || d.manufacturer === self.config.filter.manufacturer)
				&&
				(!self.config.filter.serialNumber || ((self.config.filter.serialNumber instanceof RegExp) && self.config.filter.serialNumber.test(d.serialNumber)) || d.serialNumber === self.config.filter.serialNumber)
			));
		}).filter(function(d){ return (!!d.path); }).reduce(function(c,d){ return c[d.path]=d,c; },{});
		
	} catch (err) {
		debug("<scan> *ERR* %s", err);
		return (typeof fn === "function") ? (fn(err), this) : this;
	}
		
	// check for lost devices
	Object.keys(self.devices).forEach(function(k){
		if (!devices.hasOwnProperty(k)) self.emit("disconnect", self.devices[k]);
	});
		
	// check for discovered devices
	Object.keys(devices).forEach(function(k){
		if (!self.devices.hasOwnProperty(k)) self.emit("connect", devices[k]);
	});
	
	// update device cache
	self.devices = devices;
	
	// call back if callback
	return (typeof fn === "function") ? (fn(null, devices), this) : this;
	
};

module.exports = hideous;