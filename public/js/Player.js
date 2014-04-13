var Player = (function() {
    'use strict';

    var defaults = {
        'symbol': null,
        'isComputer': false,
        'delay': 100,
        'wins': 0
    };

    function Player(opts) {
        opts = _.defaults(opts || {}, defaults);
        _.extend(this, opts);
        this.id = _.uniqueId('p');
    }

    _.extend(Player.prototype, Backbone.Events, {

        start: function() {
            this.bindEvents();
            this.trigger('request_symbol');
            this.createScorecard();
        },

        createScorecard: function() {
            this.$scorecard = $('<div>').addClass('score-card');
            this.trigger('insert_scorecard', this.$scorecard);
            this.renderScore();
        },

        bindEvents: function() {
            if (this._eventsBound) return;

            this.listenTo(this, 'your_turn', this.onTurn);
            this.listenTo(this, 'take_symbol', this.setSymbol);
            this.listenTo(this, 'game_over', this.onGameOver);
            this.listenTo(this, 'you_won', this.onYouWon);

            this._eventsBound = true;
        },

        setSymbol: function(symbol) {
            this.symbol = symbol;
        },

        onGameOver: function() {
            this.trigger('new_game');
        },

        onYouWon: function() {
            this.wins += 1;
            this.renderScore();
        },

        onTurn: function(board) {
            var play = _.partial(this.play.bind(this), board);
            setTimeout(play, this.delay || 0);
        },

        renderScore: function() {
            var text = this.id + ': ' + this.wins;
            this.$scorecard.text(text);
        },

        play: function(board) {
            console.log('My Turn! player:', this.id);
            if (!this.isComputer) return;

            var options = _getOptions(board);
            var i = _.random(0, options.length - 1);
            var choice = options[i];
            this.trigger('select_square', choice.x, choice.y);
        }
    });


    /////////// helpers
    function _getOptions(board) {
        var options = [];
        var y = board.length;
        while (y--) {
            var x = board[y].length;
            while (x--) {
                if (!board[y][x]) {
                    options.push({
                        'x': x,
                        'y': y
                    });
                }
            }
        }
        return options;
    }


    return Player;
})();