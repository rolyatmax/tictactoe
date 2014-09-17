var Q = (function() {
    'use strict';

    var DELIMITER = '|';
    var LOCAL_STORAGE_KEY = 'q';

    var defaults = {
        'persist': false,
        'saveInterval': 5000,
        'discover': 0.0,
        'alpha': 1.0,
        'decay': 0.99996,
        'discount': 0.2,
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

        // all Qs should contribute to the same matrix
        window.matrix = window.matrix || {};
        this.matrix = window.matrix;

        this.timer = 0;
        this.stack = [];
        this.started = false;
        this.bindEvents();
    }

    _.extend(Q.prototype, Backbone.Events, {
        start: function(game) {
            this.game = game;
            this.name = _localStorageKey(this.game.grid, this.game.streak);
            if (this.persist) {
                this.alpha = 0.3;
                this.decay = 1;
                this.startPersist();
            }
            this.started = true;
        },

        push: function(data) {
            this.stack.push(data);
            // console.log('Reward:', data);
        },

        sendLoop: function() {
            this.timer = setTimeout(this.sendLoop.bind(this), 10000);
            this.sendData();
        },

        sendData: function() {
            if (!this.persist || (this.started && !this.stack.length)) {
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
            }).then(this.onQReceived.bind(this));
        },

        onQReceived: function(res) {
            this.matrix = res.q[this.name] || {};
            console.log('Q received!', res);
        },

        bindEvents: function() {
            if (this._eventsBound) return;
            this.listenTo(this, 'reward_activity', this.evaluateLast);
            this._eventsBound = true;
        },

        startPersist: function() {
            $.getJSON('q', this.onQReceived.bind(this)).then(function() {
                this.persist = true;
                this.sendLoop();
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

        showChoices: function(choices) {
            var $choices = $('.choices');
            $choices.empty();
            choices = _.sortBy(choices, function(choice) {
                return -choice.points;
            });
            _.each(choices, function(choice) {
                var html = '<span>' + choice.coords + ':</span>' + choice.points;

                var $choice = $('<span>').attr({
                    'data-uid': choice.coords,
                    'class': 'choice'
                });

                $choice.html(html);
                $choices.append($choice);
            });
        },

        choose: function(board, options) {
            var state = this.getState(board);

            options = _transformOpts(options);
            _.each(options, function(option) {
                var mutated = _mutate(option, this.mutations);
                option['x'] = mutated['x'];
                option['y'] = mutated['y'];
                var actionHash = _hashSquareObj(option);
                option['hash'] = actionHash;
                option['points'] = state[actionHash] || (state[actionHash] = 0);
            }.bind(this));

            var min = _.min(options, function(option) { return option['points']; });
            var max = _.max(options, function(option) { return option['points']; });

            var chooseRandom = (min['points'] === max['points'] || Math.random() < this.discover);
            var action = chooseRandom ? options[_.random(0, options.length - 1)] : max;

            this.trigger('reward_activity', 'alive', board);

            var hash = this.mutations ? this.mutations['hash'] : _hashBoard(board, this.symbol);
            this.lastBoard = hash;
            this.lastAction = action['hash'];
            var choice = _mutate(action, this.mutations, true);
            var choices = _.map(options, function(option) {
                option = _mutate(option, this.mutations, true);
                return {
                    'coords': _hashSquareObj(option),
                    'points': option['points']
                };
            }.bind(this));
            this.showChoices(choices);
            return _hashSquareObj(choice);
        },

        evaluateLast: function(result, board) {
            if (!this.lastBoard || !this.lastAction) return;

            var reward = this.rewards[result];
            var lastState = this.matrix[this.lastBoard];
            if (!lastState) {
                return;
            }
            var lastStateActionVal = lastState[this.lastAction];
            var state = board && this.getState(board);
            var curBestChoice = state ? _.max(state) || 0 : 0;
            var points = (1 - this.discount) * lastStateActionVal + this.alpha * (reward + this.discount * curBestChoice);
            points = ((points * 1000) | 0) / 1000;
            lastState[this.lastAction] = points;

            if (this.persist) {
                this.push({
                    'name': this.name,
                    'stateHash': this.lastBoard,
                    'actionHash': this.lastAction,
                    'val': points,
                    'reward': reward
                });
            }

            if (result !== 'alive') {
                this.lastBoard = this.lastAction = 0;
                $('.choices').empty();
            }

            this.alpha *= this.decay;
            console.log(this.alpha);
            if (this.alpha < 0.000001) alert('Done training!');
        }
    });

    /////////// helpers
    function _localStorageKey(grid, streak) {
        return LOCAL_STORAGE_KEY + '_' + grid + '_' + streak;
    }

    function _hashBoard(board, mySymbol) {
        // creating hashes of the board, to store as keys for the state info for Q
        // 0 = null, a = me, b = opponent
        return _.map(_.flatten(board), function(symbol) {
            if (!symbol) return 0;
            if (symbol === mySymbol) return 'a';
            return 'b';
        }).join('');
    }

    function _transformOpts(options) {
        return _.map(options, function(option) {
            var coords = option.split(DELIMITER);
            return {
                x: coords[0],
                y: coords[1]
            };
        });
    }

    function _hashSquareObj(obj) {
        return obj.x + DELIMITER + obj.y;
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
        var newAction = _.pick(action, 'x', 'y', 'points');
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
