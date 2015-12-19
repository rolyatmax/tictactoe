import {sortBy, min, max, random, pick, flatten, cloneDeep} from 'lodash';
import Backbone from 'backbone';
import $ from 'jquery';


const DELIMITER = '|';
const LOCAL_STORAGE_KEY = 'q';

let defaults = {
    persist: false,
    saveInterval: 5000,
    discover: 0.0,
    alpha: 1.0,
    decay: 0.99996,
    discount: 0.2,
    rewards: {
        alive: 1,
        win: 10,
        lose: -1000,
        cat: 1
    }
};

function Q(opts = {}) {
    Object.assign(this, defaults, opts);

    // all Qs should contribute to the same matrix
    window.matrix = window.matrix || {};
    this.matrix = window.matrix;

    this.timer = 0;
    this.stack = [];
    this.started = false;
    this.bindEvents();
}

Q.prototype = {
    ...Backbone.Events,

    start(game) {
        this.game = game;
        this.name = _localStorageKey(this.game.grid, this.game.streak);
        if (this.persist) {
            this.alpha = 0.3;
            this.decay = 1;
            this.startPersist();
        }
        this.started = true;
    },

    push(data) {
        this.stack.push(data);
        // console.log('Reward:', data);
    },

    sendLoop() {
        this.timer = setTimeout(() => this.sendLoop(), this.saveInterval);
        this.sendData();
    },

    sendData() {
        if (!this.persist || (this.started && !this.stack.length)) {
            return;
        }

        let qs = this.stack.slice();
        this.stack = [];

        $.ajax({
            url: 'q',
            data: JSON.stringify({ qs }),
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            type: 'POST'
        }).then(this.onQReceived.bind(this));
    },

    onQReceived(res) {
        this.matrix = res.q[this.name] || {};
        console.log('Q received!', res);
    },

    bindEvents() {
        if (this._eventsBound) { return; }
        this.listenTo(this, 'reward_activity', this.evaluateLast);
        this._eventsBound = true;
    },

    startPersist() {
        $.getJSON('q', this.onQReceived.bind(this)).then(() => {
            this.persist = true;
            this.sendLoop();
        });
    },

    setSymbol(symbol) {
        this.symbol = symbol;
    },

    getState(board) {
        this.mutations = _permutationSearch(board, this.matrix, this.symbol);
        let hash = this.mutations ? this.mutations['hash'] : _hashBoard(board, this.symbol);
        this.matrix[hash] = this.matrix[hash] || {};
        return this.matrix[hash];
    },

    showChoices(choices) {
        let $choices = $('.choices');
        $choices.empty();
        choices = sortBy(choices, (choice) => -choice.points);
        choices.forEach((choice) => {
            let html = `<span>${choice.coords}:</span>${choice.points}`;
            let $choice = $('<span>').attr({
                'data-uid': choice.coords,
                'class': 'choice'
            });

            $choice.html(html);
            $choices.append($choice);
        });
    },

    choose(board, options) {
        let state = this.getState(board);
        options = _transformOpts(options).map((option) => {
            let { x, y } = _mutate(option, this.mutations);
            option = { ...option, x, y };
            let actionHash = _hashSquareObj(option);
            return {
                ...option,
                hash: actionHash,
                points: state[actionHash] || (state[actionHash] = 0)
            };
        });

        let minOpt = min(options, ({points}) => points);
        let maxOpt = max(options, ({points}) => points);

        let chooseRandom = (minOpt.points === maxOpt.points || Math.random() < this.discover);
        let action = chooseRandom ? options[random(0, options.length - 1)] : maxOpt;

        this.trigger('reward_activity', 'alive', board);

        let hash = this.mutations ? this.mutations['hash'] : _hashBoard(board, this.symbol);
        this.lastBoard = hash;
        this.lastAction = action['hash'];
        let choice = _mutate(action, this.mutations, true);
        let choices = options.map((option) => {
            option = _mutate(option, this.mutations, true);
            return {
                coords: _hashSquareObj(option),
                points: option['points']
            };
        });
        this.showChoices(choices);
        return _hashSquareObj(choice);
    },

    evaluateLast(result, board) {
        if (!this.lastBoard || !this.lastAction) { return; }

        let reward = this.rewards[result];
        let lastState = this.matrix[this.lastBoard];
        if (!lastState) {
            return;
        }
        let lastStateActionVal = lastState[this.lastAction];
        let state = board && this.getState(board);
        let curBestChoice = state ? max(state) || 0 : 0;
        let points = (1 - this.discount) * lastStateActionVal +
                     this.alpha * (reward + this.discount * curBestChoice);
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
        if (this.alpha < 0.000001) { alert('Done training!'); }
    }
};

/////////// helpers
function _localStorageKey(grid, streak) {
    return `${LOCAL_STORAGE_KEY}_${grid}_${streak}`;
}

function _hashBoard(board, mySymbol) {
    // creating hashes of the board, to store as keys for the state info for Q
    // 0 = null, a = me, b = opponent
    return flatten(board).map((symbol) => {
        if (!symbol) { return 0; }
        if (symbol === mySymbol) { return 'a'; }
        return 'b';
    }).join('');
}

function _transformOpts(options) {
    return options
        .map((option) => option.split(DELIMITER))
        .map(([x, y]) => ({ x, y }));
}

function _hashSquareObj({x, y}) {
    return `${x}${DELIMITER}${y}`;
}

function _permutationSearch(board, matrix, mySymbol) {
    let mutations = {
        turns: 0,
        flips: 0,
        hash: null,
        boardSize: board.length
    };
    let flips = 1;
    while (flips--) {
        mutations['flips'] = flips;
        board = _flip(board, flips);
        let turns = 3;
        while (turns--) {
            mutations['turns'] = turns;
            let hash = _hashBoard(_rotate(board, turns), mySymbol);
            mutations['hash'] = hash;
            if (hash in matrix) { return mutations; }
        }
    }
    return false;
}

function _rotate(board, turns) {
    turns = turns || 1;
    board = cloneDeep(board);
    let newBoard;
    let lastX = board[0].length - 1;
    while (turns--) {
        newBoard = [];
        let y = board.length;
        while (y--) {
            let x = board[y].length;
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
    if (flips === 0) { return board; }
    board = cloneDeep(board);
    let y = board.length;
    while (y--) {
        board[y] = board[y].reverse();
    }
    return board;
}

function _mutate(action, mutations, reverse) {
    action = { ...action };
    let newAction = pick(action, 'x', 'y', 'points');
    let lastX = mutations['boardSize'] - 1;
    let turns = reverse ? 4 - mutations['turns'] : mutations['turns'];
    let flips = mutations['flips'];

    while (turns--) {
        newAction['x'] = lastX - action['y'];
        newAction['y'] = action['x'];
        action = {...action, ...newAction};
    }

    if (flips) {
        newAction['x'] = Math.abs(action['x'] - lastX);
    }
    return newAction;
}

export default Q;
