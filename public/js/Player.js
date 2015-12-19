import {uniqueId, sample} from 'lodash';
import $ from 'jquery';
import Backbone from 'backbone';
import Q from './Q';


const defaults = {
    symbol: null,
    isComputer: false,
    delay: 0
};

function Player(opts = {}) {
    Object.assign(this, defaults, opts);
    let prefix = this.isSmart ? 'smart' : 'p';
    this.id = this.id || uniqueId(prefix);
    if (this.isSmart) {
        this.isComputer = true;
        this.Q = new Q(opts);
    }
}

Player.prototype = {
    ...Backbone.Events,

    start({game}) {
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

    createScorecard() {
        this.$scorecard = $('<div>').addClass('score-card');
        this.trigger('insert_scorecard', this.$scorecard);
        this.renderScore();
    },

    bindEvents() {
        if (this._eventsBound) { return; }

        this.listenTo(this, 'your_turn', this.play);
        this.listenTo(this, 'you_lose', () => this.onGameOver('lose'));
        this.listenTo(this, 'cat', () => this.onGameOver('cat'));
        this.listenTo(this, 'you_won', () => this.onGameOver('win'));
        this.listenTo(this, 'toggle_computer', this.onToggleComputer);

        this._eventsBound = true;
    },

    onToggleComputer() {
        this.isComputer = !this.isComputer;
    },

    setSymbol() {
        let symbol = this.game.requestSymbol();
        this.symbol = symbol;
        if (this.isSmart) {
            this.Q.setSymbol(symbol);
        }
    },

    onGameOver(reward) {
        if (this.isSmart) {
            this.Q.trigger('reward_activity', reward);
        }

        this.total += 1;
        if (reward === 'win') {
            this.wins += 1;
            this.renderScore();
        }
    },

    renderScore() {
        this.$scorecard.html(`${this.id}: <span>${this.wins}</span>`);
    },

    play(board, options) {
        if (!this.isComputer) { return; }
        let choice = this.isSmart ? this.Q.choose(board, options) : sample(options, 1)[0];
        this.trigger('select_square', choice);
    }
};

export default Player;
