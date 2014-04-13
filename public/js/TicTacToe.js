var TicTacToe = (function() {
    'use strict';

    var X = 'x';
    var O = 'o';

    var defaults = {
        'grid': 3,
        'el': '#game'
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

            this.$el.empty().append(_.pluck(_.values(this.squares), '$el'));

            // styling
            var w = this.$el.width();
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
        },

        onClickSquare: function(e) {
            var $target = $(e.currentTarget);
            var uid = $target.data('uid');
            this.squares[uid].onClick(e);
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

    return TicTacToe;
})();