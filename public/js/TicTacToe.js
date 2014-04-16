var TicTacToe = (function() {
    'use strict';

    var DELIMITER = '|';
    var symbols = 'abcdefghijklmnopqrstuvwxyz'.split('');

    var defaults = {
        'el': '#game',
        'grid': 3,
        'streak': 3,
        'players': []
    };

    function TicTacToe(opts) {
        opts = _.defaults(opts || {}, defaults);
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
            this.playing = true;
            this.hideNotification();
            _.each(this.squares, function(square) {
                square.setValue(null);
            });
            this.board = _createBoard(this.grid);
            var i = _.random(0, this.players.length - 1);
            this.currentPlayer = this.players[i];
            this.nextTurn();
        },

        setupBoard: function() {
            if (!this.$el) throw 'Cannot setup board! No DOM Element for game found';

            this.board = _createBoard(this.grid);
            this.squares = _createSquares(this.board);

            var els = _.pluck(_.values(this.squares), '$el');
            var $squares = $('<div>').addClass('squares').append(els);
            var $notification = $('<div>').addClass('notification');
            var $scores = $('<div>').addClass('scores');
            this.$el.empty();
            this.$el.append($squares, $notification, $scores);

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

            this.currentPlayer = this.players[0];
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
            this.$el.on('click', '.notification.show', this.reset.bind(this));

            _.each(this.players, function(player) {
                var selectHandler = _.partial(this.selectSquare, player);
                var requestSymbolHandler = _.partial(this.requestSymbol, player);
                this.listenTo(player, 'select_square', selectHandler);
                this.listenTo(player, 'new_game', this.reset);
                this.listenToOnce(player, 'request_symbol', requestSymbolHandler);
                this.listenToOnce(player, 'insert_scorecard', this.onInsertScoreCard);
            }.bind(this));

            this._eventsBound = true;
        },

        nextTurn: function() {
            if (!this.playing) return;

            var winner = this.checkForWin();
            if (winner) {
                this.playing = false;
                this.showNotification(winner.id + ' won!');
                _.each(this.players, function(player) {
                    var ev = player === winner ? 'you_won' : 'you_lose';
                    player.trigger(ev);
                }.bind(this));
                return;
            }

            if (this.checkForCat()) {
                this.playing = false;
                this.showNotification('CAT!');
                _.each(this.players, function(player) {
                    player.trigger('cat');
                }.bind(this));
                return;
            }

            var curIdx = _.indexOf(this.players, this.currentPlayer);
            var nextIdx = (curIdx + 1) % this.players.length;
            this.currentPlayer = this.players[nextIdx];
            this.currentPlayer.trigger('your_turn', this.board);
        },

        onClickSquare: function(e) {
            if (this.currentPlayer.isComputer) return;

            var $target = $(e.currentTarget);
            var uid = $target.data('uid');
            var coords = uid.split(DELIMITER);
            this.selectSquare(this.currentPlayer, coords[0], coords[1]);
        },

        onKeyPress: function(e) {
            if (e.which === 32) { // spacebar
                this.togglePlay();
            }
        },

        onInsertScoreCard: function($el) {
            this.$('.scores').append($el);
        },

        selectSquare: function(player, x, y) {
            if (player !== this.currentPlayer); // throw 'Not current player';
            var square = this.getSquareByCoords(x, y);
            if (square.value) throw 'Square already taken';
            square.setValue(this.currentPlayer.symbol);
            this.updateBoard();
            this.nextTurn();
        },

        hideNotification: function() {
            $('.notification').removeClass('show');
        },

        showNotification: function(msg) {
            var $notification = this.$('.notification');
            if (msg) $notification.text(msg);
            $notification.addClass('show');
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

        requestSymbol: function(player) {
            player.trigger('take_symbol', _getSymbol());
        },

        getSquareByCoords: function(x, y) {
            return _.findWhere(_.values(this.squares), {
                'x': parseInt(x, 10),
                'y': parseInt(y, 10)
            });
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
                this.reset();
            }
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
                    '$el': $('<div>').addClass('square').data('uid', uid),
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



    return TicTacToe;
})();
