var Square = (function() {
    'use strict';

    var X = 'x';
    var O = 'o';

    var defaults = {
        'value': null
    };

    function Square(opts) {
        opts = _.defaults(opts || {}, defaults);
        _.extend(this, opts);
        this.$el = $(opts['$el']);
        this.setValue(this.value);
    }

    _.extend(Square.prototype, Backbone.Events, {

        onClick: function() {
            var newValue = this.value === X ? O :
                           this.value === O ? null : X;

            this.setValue(newValue);
        },

        setValue: function(value) {
            this.value = value;
            value = value || '';
            this.$el.text(value.toUpperCase());
        }

    });


    return Square;
})();