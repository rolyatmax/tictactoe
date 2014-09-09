var TicTacToe = (function() {
    'use strict';

    var DELIMITER = '|';
    var symbols = 'xo'.split('');

    var defaults = {
        'el': '#game',
        'grid': 3,
        'streak': 3,
        'gravity': false,
        'players': []
    };

    function TicTacToe(opts) {
        opts = _.defaults(opts || {}, defaults);
        this.totalGames = 0;
        _.extend(this, opts);
        this.$el = $(opts['el']);
        this.setup();
    }

    _.extend(TicTacToe.prototype, Backbone.Events, {

        setup: function() {
            this.setupBoard();
            this.setupPlayers();
            this.start();
        },

        reset: function() {
            if (this.playing) return;
            _.each(this.squares, function(square) {
                square.setValue(null);
            });
            this.board = _createBoard(this.grid);
            this.currentPlayer = _.sample(this.players, 1)[0];
            this.playing = true;
            this.totalGames += 1;
            this.$('.total span').text(this.totalGames);
            _.defer(this.nextTurn.bind(this));
        },

        setupBoard: function() {
            if (!this.$el) throw 'Cannot setup board! No DOM Element for game found';

            this.board = _createBoard(this.grid);
            this.squares = _createSquares(this.board);

            var els = _.pluck(this.squares, '$el');
            var $squares = this.$('.squares').append(els);

            // styling
            var w = $squares.width();
            var squareDimensions = w / this.grid;
            this.$('.square').css({
                'height': squareDimensions + 'px',
                'width': squareDimensions + 'px',
                'line-height': squareDimensions + 'px',
                'font-size': squareDimensions * 0.8 + 'px'
            });
        },

        setupPlayers: function() {
            if (!_.isArray(this.players)) throw 'players attribute must be an array of Players';

            while (this.players.length < 2) {
                this.players.push(new Player());
            }

            this.currentPlayer = _.sample(this.players, 1)[0];
        },

        start: function() {
            this.playing = true;
            this.bindEvents();
            _.each(this.players, function(player) {
                player.start({
                    'game': this
                });
            }.bind(this));
            this.nextTurn();
        },

        bindEvents: function() {
            if (this._eventsBound) return;

            $(document).on('keypress', this.onKeyPress.bind(this));

            this.$el.on('click', '.square', this.onClickSquare.bind(this));
            this.$el.on('click', '.toggle', this.toggleComputer.bind(this));
            this.$el.on('mouseover', '.choices span', this.onMouseoverChoice.bind(this));
            this.$el.on('mouseout', '.choices span', this.onMouseoutChoice.bind(this));
            this.$el.on('click', '.persist', this.togglePersist.bind(this));

            _.each(this.players, function(player) {
                var selectHandler = this.selectSquare.bind(this, player);
                this.listenTo(player, 'select_square', selectHandler);
                this.listenToOnce(player, 'insert_scorecard', this.onInsertScoreCard);
            }.bind(this));

            this._eventsBound = true;
        },

        nextTurn: function() {
            if (!this.playing) return;
            var winner = this.checkForWin();
            if (winner) {
                this.playing = false;
                _.each(this.players, function(player) {
                    var ev = player === winner ? 'you_won' : 'you_lose';
                    player.trigger(ev);
                }.bind(this));
                this.reset();
                return;
            }

            if (this.checkForCat()) {
                this.playing = false;
                _.each(this.players, function(player) {
                    player.trigger('cat');
                }.bind(this));
                this.reset();
                return;
            }

            var curIdx = _.indexOf(this.players, this.currentPlayer);
            var nextIdx = (curIdx + 1) % this.players.length;
            this.currentPlayer = this.players[nextIdx];
            var options = _getOptions(this.board, this.gravity);
            $('.square.highlight').removeClass('highlight');
            this.currentPlayer.trigger('your_turn', this.board, options);
        },

        onMouseoverChoice: function(e) {
            var uid = $(e.currentTarget).data('uid');
            $('.square[data-uid="' + uid + '"]').addClass('highlight');
        },

        onMouseoutChoice: function(e) {
            var uid = $(e.currentTarget).data('uid');
            $('.square[data-uid="' + uid + '"]').removeClass('highlight');
        },

        onClickSquare: function(e) {
            if (this.currentPlayer.isComputer) return;
            var uid = $(e.currentTarget).data('uid');
            this.selectSquare(this.currentPlayer, uid);
        },

        onKeyPress: function(e) {
            if (e.which === 32) { // spacebar
                this.toggleComputer();
            }
        },

        onInsertScoreCard: function($el) {
            this.$('.scores').append($el);
        },

        selectSquare: function(player, choice) {
            if (player !== this.currentPlayer) return; // throw 'Not current player';
            var square = this.squares[choice];
            if (square.value) throw 'Square already taken';
            var options = _getOptions(this.board, this.gravity);
            if (!_.contains(options, square.uid)) throw 'Not an option';
            square.setValue(this.currentPlayer.symbol);
            this.updateBoard();
            this.nextTurn();
        },

        updateBoard: function() {
            _.each(this.squares, function(square) {
                this.board[square.y][square.x] = square.value;
            }.bind(this));
        },

        checkForWin: function() {
            var squares = _.values(this.squares);
            var i = squares.length;

            while (i--) {
                var result = _checkForWin(this.board, this.streak, squares[i].x, squares[i].y);
                if (result) {
                    return this.getPlayerBySymbol(result);
                }
            }
            return false;
        },

        checkForCat: function() {
            return _.every(_.flatten(this.board));
        },

        requestSymbol: function() {
            return _getSymbol();
        },

        getPlayerBySymbol: function(symbol) {
            return _.findWhere(this.players, {
                'symbol': symbol
            });
        },

        togglePlay: function() {
            if (this.playing) {
                this.stopPlay();
            } else {
                this.playing = true;
                this.nextTurn();
            }
        },

        toggleComputer: function() {
            var playerTwo = this.players[1];
            playerTwo.trigger('toggle_computer');
            if (playerTwo.isComputer) {
                var options = _getOptions(this.board, this.gravity);
                playerTwo.onTurn(this.board, options);
            }
        },

        togglePersist: function() {
            _.each(this.players, function(player) {
                player.trigger('toggle_persist');
            });
        },

        stopPlay: function() {
            this.playing = false;
        },

        $: function(selector) {
            return this.$el.find(selector);
        }

    });

    //////// helpers

    function _createBoard(grid) {
        var board = [];
        var y = grid;
        while (y--) {
            board[y] = [];
            var x = grid;
            while (x--) {
                board[y][x] = null;
            }
        }
        return board;
    }

    function _createSquares(board) {
        var squares = {};
        var y = board.length;
        for (var i = 0; i < y; i++) {
            var x = board[i].length;
            for (var j = 0; j < x; j++) {
                var uid = j + DELIMITER + i;
                var val = board[i][j];
                var opts = {
                    '$el': $('<div>').addClass('square').attr('data-uid', uid),
                    'x': j,
                    'y': i,
                    'uid': uid
                };
                if (val) opts['value'] = val;
                squares[uid] = new Square(opts);
            }
        }
        return squares;
    }

    function _getSymbol() {
        var i = _.random(0, symbols.length - 1);
        return symbols.splice(i, 1)[0];
    }

    function _checkForWin(board, streak, x, y) {
        var symbol = board[y][x];
        if (!symbol) return false;

        var horizontalWin = _horizWin(board, streak, x, y);
        var verticalWin = _vertWin(board, streak, x, y);
        var diagonal1Win = _diag1Win(board, streak, x, y);
        var diagonal2Win = _diag2Win(board, streak, x, y);

        if (horizontalWin || verticalWin || diagonal1Win || diagonal2Win) {
            return symbol;
        }
        return false;
    }

    function _diag2Win(board, streak, x, y) {
        while (streak--) {
            if (x - streak < 0) return false;
            if (!board[y + streak]) return false;
            if (board[y][x] !== board[y + streak][x - streak]) return false;
        }
        return true;
    }

    function _diag1Win(board, streak, x, y) {
        while (streak--) {
            if (!board[y + streak]) return false;
            if (board[y][x] !== board[y + streak][x + streak]) return false;
        }
        return true;
    }

    function _vertWin(board, streak, x, y) {
        while (streak--) {
            if (!board[y + streak]) return false;
            if (board[y][x] !== board[y + streak][x]) return false;
        }
        return true;
    }

    function _horizWin(board, streak, x, y) {
        while (streak--) {
            if (board[y][x] !== board[y][x + streak]) return false;
        }
        return true;
    }

    // gravity is for connect four, games like tictactoe don't have gravity as a factor
    function _getOptions(board, gravity) {
        var options = [];
        var x = board[0].length;
        while (x--) {
            var y = board.length;
            while (y--) {
                if (!board[y][x]) {
                    options.push(x + DELIMITER + y);
                    if (gravity) {
                        break;
                    }
                }
            }
        }
        return options;
    }

    function _isOption(square, options) {
        return _.contains(options, square.uid);
    }

    return TicTacToe;
})();
