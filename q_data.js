
var fs = require('fs');

/*
 * Q Data
 */

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

    save: function(data) {
        var stateHash = data['stateHash'];
        var actionHash = data['actionHash'];
        var val = data['val'];

        this.data[stateHash] = this.data[stateHash] || {};
        this.data[stateHash][actionHash] = val;
    },

    get: function() {
        return this.data;
    },

    backup: function() {
        fs.writeFile('data', JSON.stringify(this.data), function(err) {
            if (err) throw err;
            console.log('Backup created');
        });
    },

    read: function() {
        var data = fs.readFileSync('data', {encoding: 'utf8'});
        return data ? JSON.parse(data) : false;
    },

    startBackup: function() {
        doBackup();
        return this;
    }
};

function doBackup() {
    setTimeout(doBackup, 15000); // backup data every 15 seconds
    qData.backup();
}

module.exports = qData.init();
