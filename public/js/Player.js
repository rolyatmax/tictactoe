var Player = (function() {
    var defaults = {
        'symbol': null,
        'isComputer': false,
        'delay': 0
    };

    function Player(opts) {
        opts = _.defaults(opts || {}, defaults);
        _.extend(this, opts);

        var prefix = this.isSmart ? 'smart' : 'p';
        this.id = _.uniqueId(prefix);
        if (this.isSmart) {
            this.isComputer = true;
            this.Q = new Q(opts);
        }
    }

    _.extend(Player.prototype, Backbone.Events, {

        start: function(opts) {
            this.game = opts['game'];
            this.wins = 0;
            this.total = 0;
            this.bindEvents();
            this.setSymbol();
            this.createScorecard();

            if (this.isSmart) {
                this.Q.start(this.game);
            }
        },

        createScorecard: function() {
            this.$scorecard = $('<div>').addClass('score-card');
            this.trigger('insert_scorecard', this.$scorecard);
            this.renderScore();
        },

        bindEvents: function() {
            if (this._eventsBound) return;

            this.listenTo(this, 'your_turn', this.onTurn);
            this.listenTo(this, 'you_lose', this.onCatOrLose.bind(this, 'lose'));
            this.listenTo(this, 'cat', this.onCatOrLose.bind(this, 'cat'));
            this.listenTo(this, 'you_won', this.onYouWon);
            this.listenTo(this, 'toggle_computer', this.onToggleComputer);
            this.listenTo(this, 'toggle_persist', this.onTogglePersist);

            this._eventsBound = true;
        },

        onToggleComputer: function() {
            this.isComputer = !this.isComputer;
        },

        onTogglePersist: function() {
            if (this.isSmart) {
                this.Q.trigger('toggle_persist');
            }
        },

        setSymbol: function() {
            var symbol = this.game.requestSymbol();
            this.symbol = symbol;
            if (this.isSmart) {
                this.Q.setSymbol(symbol);
            }
        },

        onCatOrLose: function(reward) {
            if (this.isSmart) {
                this.Q.trigger('reward_activity', reward);
            }

            this.total += 1;
        },

        onYouWon: function() {
            if (this.isSmart) {
                this.Q.trigger('reward_activity', 'win');
            }

            this.wins += 1;
            this.total += 1;
            this.renderScore();
        },

        onTurn: function(board, options) {
            var play = this.play.bind(this, board, options);
            play();
            // setTimeout(play, this.delay || 0);
        },

        renderScore: function() {
            this.$scorecard.text(this.id + ': ' + this.wins);
        },

        play: function(board, options) {
            if (!this.isComputer) return;

            var choice = this.isSmart ? this.Q.choose(board, options) : _.sample(options, 1)[0];
            this.trigger('select_square', choice);
        }
    });

    return Player;

})();
