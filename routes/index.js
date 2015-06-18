var winston = require('winston');
var qData = require('../q_data');

exports.q = function(req, res){
    var qs = req.body['qs'];

    if (qs && qs['reset']) {
        winston.info('reloading qData!');
        return qData.reload(res);
    }

    var len = qs && qs.length;
    if (len) {
        while (len--) {
            qData.save(qs[len]);
        }
        winston.info('qData saved!', qs.length);
    }

    res.send({
        q: qData.get()
    });
};
