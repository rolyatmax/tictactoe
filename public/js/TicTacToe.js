import {
    defer, sample, pluck, isArray, all, indexOf, contains, values, every,
    flatten, findWhere, random
} from 'lodash';
import $ from 'jquery';
import Backbone from 'backbone';
import Player from './Player';
import Square from './Square';


const DELIMITER = '|';
let symbols = 'xo'.split('');

function getDefaults() {
    return {
        'el': '#game',
        'grid': 3,
        'streak': 3,
        'gravity': false,
        'players': []
    };
}

function TicTacToe(opts = {}) {
    Object.assign(this, getDefaults(), opts);
    this.totalGames = 0;
    this.$el = $(this.el);
    this.setup();
}

TicTacToe.prototype = {
    ...Backbone.Events,

    setup: function() {
        this.setupBoard();
        this.setupPlayers();
        this.start();
    },

    reset: function() {
        if (this.playing) { return; }
        values(this.squares).forEach((square) => square.setValue(null));
        this.board = _createBoard(this.grid);
        this.currentPlayer = sample(this.players, 1)[0];
        this.playing = true;
        this.totalGames += 1;
        this.$('.total span').text(this.totalGames);
        defer(() => this.nextTurn());
    },

    setupBoard: function() {
        if (!this.$el) {
            throw new Error('Cannot setup board! No DOM Element for game found');
        }

        this.board = _createBoard(this.grid);
        this.squares = _createSquares(this.board);

        let els = pluck(this.squares, '$el');
        let $squares = this.$('.squares').append(els);

        // styling
        let w = $squares.width();
        let squareDimensions = w / this.grid;
        this.$('.square').css({
            'height': `${squareDimensions}px`,
            'width': `${squareDimensions}px`,
            'line-height': `${squareDimensions}px`,
            'font-size': `${squareDimensions * 0.8}px`
        });
    },

    setupPlayers: function() {
        if (!isArray(this.players)) {
            throw new Error('players attribute must be an array of Players');
        }

        while (this.players.length < 2) {
            this.players.push(new Player());
        }

        this.currentPlayer = sample(this.players, 1)[0];
    },

    start: function() {
        this.playing = true;
        this.bindEvents();
        this.players.forEach((player) => player.start({'game': this}));
        this.training = all(this.players, (player) => player.isComputer);
        this.toggleMessages();
        this.nextTurn();
    },

    bindEvents: function() {
        if (this._eventsBound) { return; }

        $(document).on('keypress', this.onKeyPress.bind(this));

        this.$el.on('click', '.square', this.onClickSquare.bind(this));
        this.$el.on('click', '.toggle', this.toggleComputer.bind(this));
        this.$el.on('mouseover', '.choices span', this.onMouseoverChoice.bind(this));
        this.$el.on('mouseout', '.choices span', this.onMouseoutChoice.bind(this));

        this.players.forEach((player) => {
            let selectHandler = this.selectSquare.bind(this, player);
            this.listenTo(player, 'select_square', selectHandler);
            this.listenToOnce(player, 'insert_scorecard', this.onInsertScoreCard);
        });

        this._eventsBound = true;
    },

    nextTurn: function() {
        if (!this.playing) { return; }
        let winner = this.checkForWin();
        if (winner) {
            this.playing = false;
            this.players.forEach((player) => {
                let ev = player === winner ? 'you_won' : 'you_lose';
                player.trigger(ev);
            });
            this.reset();
            return;
        }

        if (this.checkForCat()) {
            this.playing = false;
            this.players.forEach((player) => player.trigger('cat'));
            this.reset();
            return;
        }

        let curIdx = indexOf(this.players, this.currentPlayer);
        let nextIdx = (curIdx + 1) % this.players.length;
        this.currentPlayer = this.players[nextIdx];
        let options = _getOptions(this.board, this.gravity);
        $('.square.highlight').removeClass('highlight');
        this.currentPlayer.trigger('your_turn', this.board, options);
    },

    onMouseoverChoice: function(e) {
        let uid = $(e.currentTarget).data('uid');
        $('.square[data-uid="' + uid + '"]').addClass('highlight');
    },

    onMouseoutChoice: function(e) {
        let uid = $(e.currentTarget).data('uid');
        $('.square[data-uid="' + uid + '"]').removeClass('highlight');
    },

    onClickSquare: function(e) {
        if (this.currentPlayer.isComputer) { return; }
        let uid = $(e.currentTarget).data('uid');
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
        if (player !== this.currentPlayer) { return; } // throw 'Not current player';
        let square = this.squares[choice];
        if (square.value) { throw new Error('Square already taken'); }
        let options = _getOptions(this.board, this.gravity);
        if (!contains(options, square.uid)) { throw new Error('Not an option'); }
        square.setValue(this.currentPlayer.symbol);
        this.updateBoard();
        this.nextTurn();
    },

    updateBoard: function() {
        values(this.squares).forEach(({x, y, value}) => this.board[y][x] = value);
    },

    checkForWin: function() {
        let squares = values(this.squares);
        let i = squares.length;

        while (i--) {
            let result = _checkForWin(this.board, this.streak, squares[i].x, squares[i].y);
            if (result) {
                return this.getPlayerBySymbol(result);
            }
        }
        return false;
    },

    checkForCat: function() {
        return every(flatten(this.board));
    },

    requestSymbol: function() {
        return _getSymbol();
    },

    getPlayerBySymbol: function(symbol) {
        return findWhere(this.players, {symbol});
    },

    toggleMessages: function() {
        $('.for-playing').toggleClass('show', !this.training);
        $('.for-training').toggleClass('show', this.training);
    },

    toggleComputer: function() {
        this.training = !this.training;
        this.toggleMessages();
        let playerTwo = this.players[1];
        playerTwo.trigger('toggle_computer');
        if (playerTwo.isComputer) {
            let options = _getOptions(this.board, this.gravity);
            playerTwo.onTurn(this.board, options);
        }
    },

    $: function(selector) {
        return this.$el.find(selector);
    }
};

//////// helpers

function _createBoard(grid) {
    let board = [];
    let y = grid;
    while (y--) {
        board[y] = [];
        let x = grid;
        while (x--) {
            board[y][x] = null;
        }
    }
    return board;
}

function _createSquares(board) {
    let squares = {};
    let y = board.length;
    for (let i = 0; i < y; i++) {
        let x = board[i].length;
        for (let j = 0; j < x; j++) {
            let uid = j + DELIMITER + i;
            let val = board[i][j];
            let opts = {
                '$el': $('<div>').addClass('square').attr('data-uid', uid),
                'x': j,
                'y': i,
                'uid': uid
            };
            if (val) { opts['value'] = val; }
            squares[uid] = new Square(opts);
        }
    }
    return squares;
}

function _getSymbol() {
    let i = random(0, symbols.length - 1);
    return symbols.splice(i, 1)[0];
}

function _checkForWin(board, streak, x, y) {
    let symbol = board[y][x];
    if (!symbol) { return false; }

    let horizontalWin = _horizWin(board, streak, x, y);
    let verticalWin = _vertWin(board, streak, x, y);
    let diagonal1Win = _diag1Win(board, streak, x, y);
    let diagonal2Win = _diag2Win(board, streak, x, y);

    if (horizontalWin || verticalWin || diagonal1Win || diagonal2Win) {
        return symbol;
    }
    return false;
}

function _diag2Win(board, streak, x, y) {
    while (streak--) {
        if (x - streak < 0) { return false; }
        if (!board[y + streak]) { return false; }
        if (board[y][x] !== board[y + streak][x - streak]) { return false; }
    }
    return true;
}

function _diag1Win(board, streak, x, y) {
    while (streak--) {
        if (!board[y + streak]) { return false; }
        if (board[y][x] !== board[y + streak][x + streak]) { return false; }
    }
    return true;
}

function _vertWin(board, streak, x, y) {
    while (streak--) {
        if (!board[y + streak]) { return false; }
        if (board[y][x] !== board[y + streak][x]) { return false; }
    }
    return true;
}

function _horizWin(board, streak, x, y) {
    while (streak--) {
        if (board[y][x] !== board[y][x + streak]) { return false; }
    }
    return true;
}

// gravity is for connect four, games like tictactoe don't have gravity as a factor
function _getOptions(board, gravity) {
    let options = [];
    let x = board[0].length;
    while (x--) {
        let y = board.length;
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

export default TicTacToe;
