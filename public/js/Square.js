import $ from 'jquery';
import Backbone from 'backbone';


const defaults = { value: null };

function Square(opts = {}) {
    Object.assign(this, defaults, opts, { $el: $(opts.$el) });
    this.setValue(this.value);
}

Square.prototype = {
    ...Backbone.Events,

    setValue(value) {
        this.value = value;
        this.$el.text(value || '');
    }
};

export default Square;
