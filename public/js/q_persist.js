var qPersist = (function () {
    "use strict";

    var qPersist = {
        stack: [],
        started: false,

        start: function(cb) {
            this.startCb = cb || function() {};
            send();
        },

        save: function(data) {
            this.stack.push(data);
        },

        sendData: function() {
            if (this.started && !this.stack.length) {
                return;
            }

            var qs = this.stack.slice();
            this.stack = [];
            return $.ajax({
                url: '/q',
                data: JSON.stringify({qs: qs}),
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                type: 'POST'
            }).then(function(res) {
                window._Q = res.q;
                console.log('Q received!', res);
                if (!this.started) {
                    this.started = true;
                    this.startCb({'Q': res.q});
                }
            }.bind(this));
        }
    };

    function send() {
        setTimeout(send, 10000); // send data every 5 seconds
        qPersist.sendData();
    }

    return qPersist;

}());
