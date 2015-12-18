import _ from 'lodash';
import $ from 'jquery';
import Backbone from 'backbone';


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
    setValue: function(value) {
        this.value = value;
        value = value || '';
        this.$el.text(value);
    }
});


export default Square;
