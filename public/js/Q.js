var Q = (function() {
    'use strict';

    var DELIMITER = '|';
    var LOCAL_STORAGE_KEY = 'q';

    var defaults = {
        'saveInterval': 5000,
        'discover': 0.05,
        'alpha': 0.3,
        'rewards': {
            'alive': 1,
            'win': 500,
            'lose': -500,
            'cat': 0
        }
    };

    function Q(opts) {
        opts = _.defaults(opts || {}, defaults);
        _.extend(this, opts);
        this.bindEvents();
    }

    _.extend(Q.prototype, Backbone.Events, {
        start: function(game) {
            this.game = game;
            this.loadMatrix();
            this.saveMatrix();
        },

        loadMatrix: function() {
            var q = localStorage.getItem(_localStorageKey(this.game.grid, this.game.streak));
            this.matrix = q ? JSON.parse(q) : {};
            if (q) console.log('using stored Q:', _localStorageKey(this.game.grid, this.game.streak));
        },

        saveMatrix: function() {
            if (this.saveInterval) {
                setTimeout(this.saveMatrix.bind(this), this.saveInterval);
            }
            localStorage.setItem(_localStorageKey(this.game.grid, this.game.streak), JSON.stringify(this.matrix));
            console.log('saved to localStorage');
        },

        bindEvents: function() {
            if (this._eventsBound) return;
            this.listenTo(this, 'reward_activity', this.evaluateLast);
            this._eventsBound = true;
        },

        setSymbol: function(symbol) {
            this.symbol = symbol;
        },

        hashBoard: function(board) {
            if (!this.symbol) throw 'Hashing requires a symbol to be set first';

            // creating hashes of the board, to store as keys for the state info for Q
            // 0 = null, a = me, b = opponent
            return 'h_' + _.map(_.flatten(board), function(symbol) {
                if (!symbol) return 0;
                if (symbol === this.symbol) return 'a';
                return 'b';
            }.bind(this)).join('');
        },

        choose: function(board, options) {
            var hash = this.hashBoard(board);
            var state = this.matrix[hash] || (this.matrix[hash] = {});

            _.each(options, function(option) {
                var actionHash = option.x + DELIMITER + option.y;
                option['hash'] = actionHash;
                option['points'] = state[actionHash] || (state[actionHash] = 0);
            });

            var min = _.min(options, function(option) { return option['points']; });
            var max = _.max(options, function(option) { return option['points']; });

            var chooseRandom = (min['points'] === max['points'] || Math.random < this.discover);
            var action = chooseRandom ? options[_.random(0, options.length - 1)] : max;

            this.curPts = action['points'];
            this.trigger('reward_activity', 'alive');

            this.lastBoard = hash;
            this.lastAction = action['hash'];
            return action;
        },

        evaluateLast: function(result) {
            if (!this.lastBoard || !this.lastAction) return;

            var reward = this.rewards[result];
            var lastState = this.matrix[this.lastBoard];
            var lastStateActionVal = lastState[this.lastAction];
            var curPts = this.curPts || 0;
            var points = lastStateActionVal + this.alpha * (reward + curPts - lastStateActionVal);
            lastState[this.lastAction] = points;
        }

    });

    /////////// helpers
    function _localStorageKey(grid, streak) {
        return LOCAL_STORAGE_KEY + '_' + grid + '_' + streak;
    }


    return Q;
})();