Reinforcement Learning With TicTacToe
=====================================

Making computers learn how to play tic-tac-toe.

I started messing around with reinforcement learning when I heard about a [Flappy Bird RL project](http://sarvagyavaish.github.io/FlappyBirdRL) on Github. Out of the box, the algorithm took about 7 or 8 hours to train. I figured it could learn faster if multiple instances of the same algorithm spread out over the internet could all work to update the same matrix. So after forking the repo and creating a [distributed learning version](https://github.com/rolyatmax/FlappyBirdRL), I found myself wanting to explore reinforcement learning a bit more. And thus was born this little project.

So, some explanation is needed. The first two options presented, "Train Locally" and "Train with Distributed Learning" simply refer to where the q-matrix or "policy" is stored. "Train Locally" keeps the all the training confined to this browser tab. You can watch it train from nothing (it might take 2 or 3 minutes). "Distributed Learning" trains locally as well, but it also pushes updates to the policy to a server which returns the canonical policy the server stores. This policy tends to be trained fairly well already and rarely loses.

The algorithm trains by playing against a version of itself. The "Smart" version (listed under the "Scores" section) always selects a move its trained policy recommends. The "Kinda Smart" version (a bit of a misnomer) will occasionally select random moves to see the outcome. It is this "exploration" that actually allows the algorithm to learn. Because you can play a tic-tac-toe game perfectly and not win, the best measure of a policy's efficacy is how many wins it has given up to its opponent. Because the "Kinda Smart" version makes random moves for some percentage of its total plays, it happens to give up quite a few wins to its opponent.

You can pause the training and play against the "Smart" version at any time. After the algorithm moves, it displays its options in the bottom corner of the screen. You can mouse over these options to see which ones were most favored.

There were some interesting optimizations I made which seemed to have helped speed up learning quite a bit. The most important optimization was probably the work I did normalizing equivalent board states. For (almost) every possible tic-tac-toe board, there are at least a few other tic-tac-toe boards that are essentially equivalent. For example, you can take a given board and rotate three times or flip it along the vertical and/or horizontal axes. Making sure these board states were considered equivalent cut down on the amount of memory required to store the policy and, consequently, the amount of time to learn the policy.

Check out the code at [github.com/rolyatmax/tictactoe](https://github.com/rolyatmax/tictactoe). It's a bit messy in parts (as it has changed tremendously over time), but the meat of the learning algorithm is in `Q.js`.


To run on your own:
------------------

`npm install`

`cd public && bower install`

`cd .. && node app`

Point your browser to `localhost:8080`
