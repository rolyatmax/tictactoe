var Q = (function() {
    'use strict';

    var DELIMITER = '|';
    var LOCAL_STORAGE_KEY = 'q';

    var defaults = {
        'saveInterval': 5000,
        'discover': 0.01,
        'alpha': 0.3,
        'rewards': {
            'alive': 1,
            'win': 500,
            'lose': -1000,
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
            this.listenTo(this, 'clear', this.clear);
            this._eventsBound = true;
        },

        clear: function() {
            this.matrix = {};
            localStorage.setItem(_localStorageKey(this.game.grid, this.game.streak), '');
            this.lastAction = null;
        },

        setSymbol: function(symbol) {
            this.symbol = symbol;
        },

        getState: function(board) {
            this.mutations = _permutationSearch(board, this.matrix, this.symbol);
            var hash = this.mutations ? this.mutations['hash'] : _hashBoard(board, this.symbol);
            return this.matrix[hash] || (this.matrix[hash] = {});
        },

        choose: function(board, options) {
            var state = this.getState(board);

            _.each(options, function(option) {
                var mutated = _mutate(option, this.mutations);
                option['x'] = mutated['x'];
                option['y'] = mutated['y'];
                var actionHash = option['x'] + DELIMITER + option['y'];
                option['hash'] = actionHash;
                option['points'] = state[actionHash] || (state[actionHash] = 0);
            }.bind(this));

            var min = _.min(options, function(option) { return option['points']; });
            var max = _.max(options, function(option) { return option['points']; });

            var chooseRandom = (min['points'] === max['points'] || Math.random() < this.discover);
            var action = chooseRandom ? options[_.random(0, options.length - 1)] : max;

            this.curPts = action['points'];
            this.trigger('reward_activity', 'alive');

            var hash = this.mutations ? this.mutations['hash'] : _hashBoard(board, this.symbol);
            this.lastBoard = hash;
            this.lastAction = action['hash'];
            return _mutate(action, this.mutations, true);
        },

        evaluateLast: function(result) {
            if (!this.lastBoard || !this.lastAction) return;

            var reward = this.rewards[result];
            var lastState = this.matrix[this.lastBoard];
            var lastStateActionVal = lastState[this.lastAction];
            var curPts = this.curPts || 0;
            var points = lastStateActionVal + this.alpha * (reward + curPts - lastStateActionVal);
            lastState[this.lastAction] = ((points * 1000) | 0) / 1000;
        }

    });

    /////////// helpers
    function _localStorageKey(grid, streak) {
        return LOCAL_STORAGE_KEY + '_' + grid + '_' + streak;
    }

    function _hashBoard(board, mySymbol) {
        // creating hashes of the board, to store as keys for the state info for Q
        // 0 = null, a = me, b = opponent
        return 'h_' + _.map(_.flatten(board), function(symbol) {
            if (!symbol) return 0;
            if (symbol === mySymbol) return 'a';
            return 'b';
        }).join('');
    }

    function _permutationSearch(board, matrix, mySymbol) {
        var mutations = {
            turns: 0,
            flips: 0,
            hash: null,
            boardSize: board.length
        };
        var flips = 1;
        while (flips--) {
            mutations['flips'] = flips;
            board = _flip(board, flips);
            var turns = 3;
            while (turns--) {
                mutations['turns'] = turns;
                var hash = _hashBoard(_rotate(board, turns), mySymbol);
                mutations['hash'] = hash;
                if (hash in matrix) return mutations;
            }
        }
        return false;
    }

    function _rotate(board, turns) {
        turns = turns || 1;
        board = _.cloneDeep(board);
        var newBoard;
        var lastX = board[0].length - 1;
        while (turns--) {
            newBoard = [];
            var y = board.length;
            while (y--) {
                var x = board[y].length;
                while (x--) {
                    newBoard[x] = newBoard[x] || [];
                    newBoard[x][lastX - y] = board[y][x];
                }
            }
            board = newBoard;
        }
        return board;
    }

    function _flip(board, flips) {
        if (flips === 0) return board;
        board = _.cloneDeep(board);
        var y = board.length;
        while (y--) {
            board[y] = board[y].reverse();
        }
        return board;
    }

    function _mutate(action, mutations, reverse) {
        action = _.clone(action);
        var newAction = _.clone(action);
        var lastX = mutations['boardSize'] - 1;
        var turns = reverse ? 4 - mutations['turns'] : mutations['turns'];
        var flips = mutations['flips'];

        while (turns--) {
            newAction['x'] = lastX - action['y'];
            newAction['y'] = action['x'];
            action = _.extend(action, newAction);
        }

        if (flips) {
            newAction['x'] = Math.abs(action['x'] - lastX);
        }
        return newAction;
    }

    return Q;
})();