
var fs = require('fs');

/*
 * Q Data
 */

var filename = 'data';

var qData = {
    init: function() {
        var data = this.read();
        if (data) {
            this.data = data;
            console.log('Loading from backup!', data);
            return this.startBackup();
        }

        this.data = {};
        return this.startBackup();
    },

    reload: function(res) {
        var fn = filename + '_' + Date.now();
        console.log('saved data at:', fn);
        this.backup(fn, function() {
            console.log('deleting:', filename);
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

        fn = fn || filename;
        fs.writeFile(fn, JSON.stringify(this.data), function(err) {
            if (err) throw err;
            if (cb) cb();
            console.log('Backup created', new Date());
            this.updated = false;
        }.bind(this));
    },

    read: function() {
        try {
            var data = fs.readFileSync(filename, {encoding: 'utf8'});
            return JSON.parse(data);
        } catch (e) {
            fs.writeFile(filename);
            console.warn('error reading file:', e);
            return false;
        }
    },

    startBackup: function() {
        doBackup();
        return this;
    },


};

var timeout;

function doBackup() {
    clearTimeout(timeout);
    timeout = setTimeout(doBackup, 15000); // backup data every 15 seconds
    qData.backup();
}

module.exports = qData.init();
