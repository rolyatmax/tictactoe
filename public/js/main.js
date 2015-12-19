/* globals Info */

import 'babel-polyfill';
import $ from 'jquery';
import Player from './Player';
import TicTacToe from './TicTacToe';
import readme from '../README.md';


new Info({
    keyTrigger: true,
    container: 'wrapper',
    html: readme
});

$(() => {
    $(document)
        .on('click', '.local', startTraining.bind(null, 'local'))
        .on('click', '.distributed', startTraining.bind(null, 'distributed'));

    function startTraining(method) {
        $(document).off('click');
        $('.training-choices').remove();
        $('#game').show();
        let persist = method === 'distributed';
        if (persist) {
            $.getJSON('q').then((res) => {
                // this will break if grid/streak vals change
                window.matrix = res.q['q_3_3'] || {};
            }).then(startGame.bind(null, persist));
        } else {
            startGame(persist);
        }
    }

    function startGame(persist) {
        window.game = new TicTacToe({
            grid: 3,
            streak: 3,
            players: [
                new Player({
                    persist: persist,
                    isSmart: true,
                    id: 'Smart'
                }),
                new Player({
                    id: 'Kinda Smart',
                    persist: persist,
                    isComputer: true,
                    isSmart: true,
                    discover: 0.5
                })
            ]
        });
    }
});
