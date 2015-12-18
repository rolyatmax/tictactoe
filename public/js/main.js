import $ from 'jquery';
import Player from './Player';
import TicTacToe from './TicTacToe';


new Info({
    keyTrigger: true,
    container: 'wrapper',
    isMarkdown: true,
    url: 'README.md'
});

$(function() {
    $(document).on('click', '.local', startTraining.bind(null, 'local'))
               .on('click', '.distributed', startTraining.bind(null, 'distributed'));

    function startTraining(method) {
        $(document).off('click');
        $('.training-choices').remove();
        $('#game').show();
        var persist = method === 'distributed';
        if (persist) {
            $.getJSON('q').then(function(res) {
                window.matrix = res.q['q_3_3'] || {}; // this will break if grid/streak vals change
            }).then(startGame.bind(null, persist));
        } else {
            startGame(persist);
        }
    }

    function startGame(persist) {
        window.game = new TicTacToe({
            'grid': 3,
            'streak': 3,
            'players': [
                new Player({
                    'persist': persist,
                    'isSmart': true,
                    'id': 'Smart'
                }),
                new Player({
                    'id': 'Kinda Smart',
                    'persist': persist,
                    'isComputer': true,
                    'isSmart': true,
                    'discover': 0.5
                })
            ]
        });
    }
});
