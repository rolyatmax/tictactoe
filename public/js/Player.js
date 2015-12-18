import _ from 'lodash';
import $ from 'jquery';
import Backbone from 'backbone';
import Q from './Q';


let defaults = {
    'symbol': null,
    'isComputer': false,
    'delay': 0
};

function Player(opts = {}) {
    Object.assign(this, defaults, opts);

    let prefix = this.isSmart ? 'smart' : 'p';
    this.id = this.id || _.uniqueId(prefix);
    if (this.isSmart) {
        this.isComputer = true;
        this.Q = new Q(opts);
    }
}

Player.prototype = {
    ...Backbone.Events,

    start: function({game}) {
        this.game = game;
        this.wins = 0;
        this.total = 0;
        this.bindEvents();
        this.setSymbol();
        this.createScorecard();

        if (this.isSmart) {
            this.Q.start(game);
        }
    },

    createScorecard: function() {
        this.$scorecard = $('<div>').addClass('score-card');
        this.trigger('insert_scorecard', this.$scorecard);
        this.renderScore();
    },

    bindEvents: function() {
        if (this._eventsBound) { return; }

        this.listenTo(this, 'your_turn', this.play);
        this.listenTo(this, 'you_lose', () => this.onGameOver('lose'));
        this.listenTo(this, 'cat', () => this.onGameOver('cat'));
        this.listenTo(this, 'you_won', () => this.onGameOver('win'));
        this.listenTo(this, 'toggle_computer', this.onToggleComputer);

        this._eventsBound = true;
    },

    onToggleComputer: function() {
        this.isComputer = !this.isComputer;
    },

    setSymbol: function() {
        let symbol = this.game.requestSymbol();
        this.symbol = symbol;
        if (this.isSmart) {
            this.Q.setSymbol(symbol);
        }
    },

    onGameOver: function(reward) {
        if (this.isSmart) {
            this.Q.trigger('reward_activity', reward);
        }

        this.total += 1;
        if (reward === 'win') {
            this.wins += 1;
            this.renderScore();
        }
    },

    renderScore: function() {
        this.$scorecard.html(`${this.id}: <span>${this.wins}</span>`);
    },

    play: function(board, options) {
        if (!this.isComputer) { return; }
        let choice = this.isSmart ? this.Q.choose(board, options) : _.sample(options, 1)[0];
        this.trigger('select_square', choice);
    }
};

export default Player;
