var TicTacToe = (function() {
    'use strict';

    var X = 'x';
    var O = 'o';

    var defaults = {
        'grid': 3,
        'el': '#game',
        'streak': 3
    };

    function TicTacToe(opts) {
        opts = _.defaults(opts || {}, defaults);
        _.extend(this, opts);
        this.$el = $(opts['el']);
        this.setupBoard();
    }

    _.extend(TicTacToe.prototype, Backbone.Events, {

        setupBoard: function() {
            if (!this.$el) throw 'Cannot setup board! No DOM Element for game found';

            this.board = _createBoard(this.grid);
            this.squares = _createSquares(this.board);

            var els = _.pluck(_.values(this.squares), '$el');
            var $squares = $('<div>').addClass('squares').append(els);
            var $checkWin = $('<div>').addClass('check-win').text('Check for a win!');
            var $notification = $('<div>').addClass('notification');
            this.$el.append($squares, $checkWin, $notification);

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

        start: function() {
            this.bindEvents();
        },

        bindEvents: function() {
            this.$el.on('click', '.square', this.onClickSquare.bind(this));
            this.$el.on('click', '.check-win', this.onCheckWin.bind(this));
            this.$el.on('click', '.notification.show', this.onClickNotification.bind(this));
        },

        onClickSquare: function(e) {
            var $target = $(e.currentTarget);
            var uid = $target.data('uid');
            this.squares[uid].onClick(e);
            this.updateBoard();
        },

        onCheckWin: function() {
            if (this.checkForWin()) {
                this.showNotification('Someone won!');
            }
        },

        onClickNotification: function(e) {
            $(e.currentTarget).removeClass('show');
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
            var results = _.map(this.squares, function(square) {
                return _checkForWin(this.board, square.x, square.y);
            }.bind(this));
            return _.any(results);
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
                var uid = _.uniqueId('s');
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

    function _checkForWin(board, x, y) {
        var val = board[y][x];
        if (!val) return false;

        var horizontalWin = val === board[y][x + 1] &&
            val === board[y][x + 2];

        var verticalWin = board[y + 1] && board[y + 2] &&
            val === board[y + 1][x] &&
            val === board[y + 2][x];

        var diagonal1Win = board[y + 1] && board[y + 2] &&
            val === board[y + 1][x + 1] &&
            val === board[y + 2][x + 2];

        var diagonal2Win = board[y + 1] && board[y + 2] && x - 2 >= 0 &&
            val === board[y + 1][x - 1] &&
            val === board[y + 2][x - 2];

        return horizontalWin || verticalWin || diagonal1Win || diagonal2Win;
    }

    return TicTacToe;
})();