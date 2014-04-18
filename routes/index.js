
var qData = require('../q_data');

/*
 * POST update to Q matrix
 */

exports.q = function(req, res){
    var qs = req.body['qs'];

    console.log(qs);

    if (qs['reset']) {
        console.log('reloading qData!');
        return qData.reload(res);
    }

    var len = qs && qs.length;
    if (len) {
        while (len--) {
            qData.save(qs[len]);
        }
        console.log('qData saved!', qs.length);
    }

    res.send({
        q: qData.get()
    });
};

function _isNum(val) {
    return typeof val === 'number';
}
