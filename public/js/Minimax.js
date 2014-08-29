var Minimax = (function() {
    'use strict';

    var DELIMITER = '|';
    var LOCAL_STORAGE_KEY = 'q';

    var defaults = {};

    function Minimax(opts) {
        opts = _.defaults(opts || {}, defaults);
        _.extend(this, opts);
        this.started = false;
    }

    _.extend(Minimax.prototype, Backbone.Events, {
        start: function(game) {
            this.game = game;
            this.started = true;
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
        }

    });

    /////////// helpers

    function _hashBoard(board, mySymbol, inversions) {
        // creating hashes of the board, to store as keys for the state info for Q
        // 0 = null, a = me, b = opponent
        var mine = inversions ? 'a' : 'b';
        var opp = inversions ? 'b' : 'a';

        return 'h_' + _.map(_.flatten(board), function(symbol) {
            if (!symbol) return 0;
            if (symbol === mySymbol) return 'a';
            return 'b';
        }).join('');
    }

    // borrowed from minimax repo
    function minMax(p, b, d) {
        // p: player designation
        // b: current board state
        // d: iteration depth

        var score = b.getScore(p);

        // some game states do not require any thinking (e.g. already lost or won)
        if (d === 0) return [null, score]; // max depth reached. just return the score.
        if (score == -WIN_SCORE) return [null, score]; // we lose, not good.
        if (score == WIN_SCORE) return [null, score]; // we win, good.
        if (b.isFull()) return [null, 8888]; // board is full, pretty good, but not as good as winning.

        // simple optimization attempt. look ahead two moves to see if win or lose possible.
        // this prevents the algorithm from exploring parts of the state space that are unrealistic to occur.
        if (d > 2) {
            for (var q = 0; q < b.size; ++q) { // for each possible move.
                var n = b.clone(); // copy current state.
                if (n.playColumn(q)) { // make move.
                    var qs = minMax(p, n, 2); // look ahead one move.
                    if (qs[1] == WIN_SCORE || qs[1] == -WIN_SCORE)  {
                        return [q, qs[1]]; // if I win or lose, stop exploring.
                    }
                }
            }
        }

        // algorithm considers best and worst possible moves in one loop to save lines of code.
        var maxv = 0; // best score.
        var maxc = -1; // column where best score occurs.
        var minv = 999999; // worst score.
        var minc = -1; // colum where worst score occurs.
        for (var q = 0; q < b.size; ++q) { // for each possible move.
            var n = b.clone(); // copy current state.
            if (n.playColumn(q)) { // make move.
                var next = minMax(p, n, d - 1); // look ahead d-1 moves.
                if (maxc == -1 || next[1] > maxv) {
                    maxc = q;
                    maxv = next[1];
                } // compare to previous best.
                if (minc == -1 || next[1] < minv) {
                    minc = q;
                    minv = next[1];
                } // compare to previous worst.
            }}

        if (b.turn == p) { // if it is our turn.
            return [maxc, maxv/2 + score/2]; // make best possible move.
        } else { // otherwise.
            return [minc, minv/2 + score/2]; // make worst possible move.
        }
    }

    function Board(size, turn, state) {
        this.size = size;
        this.turn = turn;
        this.state = state;
    }

    Board.prototype.getHash = function() {
        return this.state.toString();
    };

    Board.prototype.playColumn = function(c) {
        if (this.getCell(0, c) == null) {
            var i = this.size - 1;
            while (this.getCell(i, c) != null) {
                i--;
            }
            this.state[i * this.size + c] = this.turn;
            this.turn = Math.abs(this.turn - 1);
            return true;
        }
        return false;
    };

    Board.prototype.getCell = function(r, c) {
        if (r >= 0 && c >= 0 && r < this.size && c < this.size) {
            try {
                return (this.state[r * this.size + c]);
            } catch(err) {
                return null;
            }
        }
        return OFF_BOARD;
    };

    Board.prototype.getScore = function(p) {
        var hash = '' + p + this.getHash();
        if (scoreCache[hash] != null) {
            return scoreCache[hash];
        }
        var score = 0;
        for (i = 0; i < this.size; ++i) {
            for (j = 0; j < this.size - 4 + 1; ++j) {
                var line = [];
                for (k = 0; k < 6; ++k) {
                    line[k] = [0, 0, 0];
                }

                for (n = j; n < j + 4; ++n) {
                    line[0][this.getCell(n, i)] += 1; // columns
                    line[1][this.getCell(i, n)] += 1; // rows
                    line[2][this.getCell(n, n - i)] += 1; // diagonal southwest half
                    line[3][this.getCell(this.size - n - 1, n - i)] += 1; // diagonal northwest half
                    if (i > 0) {
                        line[4][this.getCell(n - i, n)] += 1; // diagonal northweast half
                        line[5][this.getCell(n + i, this.size - n - 1)] += 1; // diagonal southeast half
                    }
                }

                for (k = 0; k < 6; ++k) {
                    if (line[k][p] == 4) return WIN_SCORE; // win
                    if (line[k][Math.abs(p - 1)] == 4) return -WIN_SCORE; // lose
                    if (line[k][Math.abs(p - 1)] == 0 && line[k][OFF_BOARD] == 0) {
                        score += Math.pow(line[k][p], 2);
                    }
                }
            }
        }

        scoreCache[hash] = score;
        return score;
    };

    Board.prototype.isFull = function() {
        for (var n = 0; n < this.size^2; ++n) {
            if (this.state[n] == null) return false;
        }
        return true;
    };

    Board.prototype.clone = function() {
        return new Board(this.size, this.turn, this.state.slice(0));
    };


    return Minimax;
})();
