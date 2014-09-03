var Q = (function() {
    'use strict';

    var DELIMITER = '|';
    var LOCAL_STORAGE_KEY = 'q';

    var defaults = {
        'useLocalStorage': false,
        'saveInterval': 5000,
        'discover': 0.0,
        'alpha': 0.9,
        'rewards': {
            'alive': 1,
            'win': 10,
            'lose': -1000,
            'cat': 1
        }
    };

    function Q(opts) {
        opts = _.defaults(opts || {}, defaults);
        _.extend(this, opts);
        this.matrix = {};
        this.stack = [];
        this.started = false;
        this.bindEvents();
    }

    _.extend(Q.prototype, Backbone.Events, {
        start: function(game) {
            this.game = game;
            $('input.discover').val(this.discover);
            this.name = _localStorageKey(this.game.grid, this.game.streak);
            if (this.useLocalStorage) {
                this.loadMatrix();
                this.saveMatrix();
            }
            this.send();
            this.started = true;
        },

        push: function(data) {
            this.stack.push(data);
        },

        set: function(attrs) {
            attrs = _.pick(attrs, _.keys(defaults));
            _.extend(this, attrs);
            _.each(attrs, function(val, attr) {
                this.trigger('change:' + attr);
            }.bind(this));
        },

        send: function() {
            setTimeout(this.send.bind(this), 10000);
            this.sendData();
        },

        sendData: function() {
            if (this.started && !this.stack.length) {
                return;
            }

            var qs = this.stack.slice();
            this.stack = [];

            return $.ajax({
                url: 'q',
                data: JSON.stringify({qs: qs}),
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                type: 'POST'
            }).then(function(res) {
                this.matrix = res.q[this.name] || {};
                console.log('Q received!', res);
            }.bind(this));
        },

        loadMatrix: function() {
            if (!this.useLocalStorage) {
                return;
            }

            var q = localStorage.getItem(this.name);
            this.matrix = q ? JSON.parse(q) : {};
            if (q) console.log('using stored Q:', this.name);
        },

        saveMatrix: function() {
            if (!this.useLocalStorage) {
                return;
            }
            if (this.saveInterval) {
                setTimeout(this.saveMatrix.bind(this), this.saveInterval);
            }
            localStorage.setItem(this.name, JSON.stringify(this.matrix));
            console.log('saved to localStorage');
        },

        bindEvents: function() {
            if (this._eventsBound) return;
            this.listenTo(this, 'reward_activity', this.evaluateLast);
            this.listenTo(this, 'clear', this.clear);
            this.listenTo(this, 'set_discover', this.setDiscover);
            this._eventsBound = true;
        },

        setDiscover: function(discover) {
            this.discover = parseFloat(discover, 10);
            console.log('Discover set to:', this.discover);
        },

        clear: function() {
            var qs = {
                'reset': true
            };

            return $.ajax({
                url: '/q',
                data: JSON.stringify({qs: qs}),
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                type: 'POST'
            }).done(function(res) {
                localStorage.setItem(this.name, '');
                window.location.reload();
            }.bind(this));
        },

        setSymbol: function(symbol) {
            this.symbol = symbol;
        },

        getState: function(board) {
            this.mutations = _permutationSearch(board, this.matrix, this.symbol);
            var hash = this.mutations ? this.mutations['hash'] : _hashBoard(board, this.symbol);
            this.matrix[hash] = this.matrix[hash] || {};
            return this.matrix[hash];
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
            if (!lastState) {
                return;
            }
            var lastStateActionVal = lastState[this.lastAction];
            var curPts = this.curPts || 0;
            var points = lastStateActionVal + this.alpha * (reward + curPts - lastStateActionVal);
            points = ((points * 1000) | 0) / 1000;
            lastState[this.lastAction] = points;

            this.push({
                'name': this.name,
                'stateHash': this.lastBoard,
                'actionHash': this.lastAction,
                'val': points
            });
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
