var Player = (function() {
    'use strict';

    var defaults = {
        'symbol': null,
        'isComputer': false,
        'delay': 0
    };

    function Player(opts) {
        opts = _.defaults(opts || {}, defaults);
        _.extend(this, opts);
        this.id = _.uniqueId('p');
    }

    _.extend(Player.prototype, Backbone.Events, {

        start: function(opts) {
            this.game = opts['game'];
            this.wins = 0;
            this.total = 0;
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
            this.listenTo(this, 'you_lose', this.onYouLose);
            this.listenTo(this, 'cat', this.onCat);
            this.listenTo(this, 'you_won', this.onYouWon);
            this.listenTo(this, 'toggle_computer', this.onToggleComputer);

            this._eventsBound = true;
        },

        onToggleComputer: function() {
            this.isComputer = !this.isComputer;
        },

        setSymbol: function(symbol) {
            this.symbol = symbol;
        },

        onCat: function() {
            this.total += 1;
            this.trigger('new_game');
        },

        onYouLose: function() {
            this.total += 1;
            this.trigger('new_game');
        },

        onYouWon: function() {
            this.wins += 1;
            this.total += 1;
            this.renderScore();
        },

        onTurn: function(board) {
            var play = _.partial(this.play.bind(this), board);
            setTimeout(play, this.delay || 0);
        },

        renderScore: function() {
            var perc = ((this.wins / this.total * 100000) | 0) / 1000;
            var text = this.id + ': ' + this.wins + ' - ' + perc + '%';
            this.$scorecard.text(text);
        },

        play: function(board) {
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
