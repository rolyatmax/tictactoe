var fs = require('fs');
var winston = require('winston');
var touch = require('touch');

var filename = 'data';

var qData = {
    init: function() {
        var data = this.read();
        if (data) {
            this.data = data;
            winston.info('Loading from backup!', data);
            return this.startBackup();
        }

        this.data = {};
        return this.startBackup();
    },

    reload: function(res) {
        var fn = filename + '_' + Date.now();
        winston.info('saved data at:', fn);
        this.backup(fn, function() {
            winston.info('deleting:', filename);
            fs.unlink(filename, function() {
                this.init();
                res.send({success: true});
            }.bind(this));
        }.bind(this));
    },

    save: function(data) {
        var name = data['name'];
        var stateHash = data['stateHash'];
        var actionHash = data['actionHash'];
        var val = data['val'];

        this.data[name] = this.data[name] || {};
        this.data[name][stateHash] = this.data[name][stateHash] || {};
        this.data[name][stateHash][actionHash] = val;

        this.updated = true;
    },

    get: function() {
        return this.data;
    },

    backup: function(fn, cb) {
        if (!this.updated) {
            return;
        }

        if (!this.data) {
            cb();
            this.updated = false;
            return;
        }

        fn = fn || filename;
        winston.info('Writing to ', fn);
        touch.sync(fn);
        fs.writeFile(fn, JSON.stringify(this.data), {flag: 'wx'}, function(err) {
            if (err) winston.error('Writefile error', err);
            if (cb) cb();
            winston.info('Backup created', new Date());
            this.updated = false;
        }.bind(this));
    },

    read: function() {
        touch.sync(filename);
        var data = fs.readFileSync(filename, {encoding: 'utf8'});
        return !!data && JSON.parse(data);
    },

    startBackup: function() {
        doBackup();
        return this;
    }
};

var timeout;

function doBackup() {
    clearTimeout(timeout);
    timeout = setTimeout(doBackup, 15000); // backup data every 15 seconds
    qData.backup();
}

module.exports = qData.init();
