export const infoHtml = `
<h1 id="reinforcement-learning-with-tictactoe">Reinforcement Learning With TicTacToe</h1>
<p>Making computers learn how to play tic-tac-toe.</p>
<p>I started messing around with reinforcement learning when I heard about a <a href="http://sarvagyavaish.github.io/FlappyBirdRL">Flappy Bird RL project</a> on GitHub. Out of the box, the algorithm took about 7 or 8 hours to train. I figured it could learn faster if multiple instances of the same algorithm spread out over the internet could all work to update the same matrix. So after forking the repo and creating a <a href="https://github.com/rolyatmax/FlappyBirdRL">distributed learning version</a>, I was able to get it to train in about 30 minutes with 8 browser tabs. I found myself wanting to explore reinforcement learning a bit more, and so this little project was born.</p>
<p>So, a general overview. This learning algorithm doesn't know how to play tic-tac-toe. It doesn't know the rules; it doesn't learn the rules; it doesn't even know it's playing against an opponent. All it knows is what the board looks like and what its options are. When it has made a move, it is rewarded or punished based on that move for that particular position. After a few thousand games, it effectively "learns" how to play. The algorithm's "knowledge" is represented in a matrix (called a "policy") where values are assigned to every possible move for each board state the algorithm has encountered.</p>
<p>The first two options presented, "Train Locally" and "Train with Distributed Learning" simply refer to where the q-matrix or "policy" is stored. "Train Locally" keeps the all the training confined to the browser tab. You can watch it train from nothing (it might take 2 or 3 minutes). "Distributed Learning" trains locally as well, but it also persists with the server. This policy tends to be trained fairly well already and rarely loses.</p>
<p>For the "distributed learning" mode, The learner pushes all policy updates onto a stack and periodically sends the batch of updated values to the server. Each update consists of a state (the board), an action (a move), and a value for that state-action pair (higher values = better moves). Currently, the server goes through the updates, writing over the state-action pairs in its own canonical policy, and then sends back an entire copy of the new-and-improved policy with which the client replaces its own.</p>
<p>As you might have guessed, there is some clobbering that takes place on the canonical policy. However, one might be able to avoid clobbering completely by only passing to the server a state, an action, and a reward. This lets the server run its own evaluation function instead of relying on clients' states. This would also require the constants in the evaluation function to match on the client and the server.</p>
<p>The algorithm trains by playing against a version of itself. The "Smart" version (listed under the "Scores" section) always selects a move its trained policy recommends. The "Kinda Smart" version (a bit of a misnomer) will occasionally select random moves to learn from the outcome. It is this "exploration" that actually allows the algorithm to discover better policies. Because you can play a tic-tac-toe game perfectly and not win, the best measure of a policy's efficacy is how many wins it has given up to its opponent. Because the "Kinda Smart" version makes random moves for some percentage of its total plays, it happens to give up quite a few wins to its opponent even though it shares the exact same q-matrix with the "Smart" version.</p>
<p>You can pause the training and play against the "Smart" version at any time. After the algorithm moves, it displays its options in the bottom corner of the screen. You can mouse over these options to see the relative favorability of each move.</p>
<p>There were some interesting optimizations I made which seemed to have helped speed up learning quite a bit. The most important optimization was probably the work I did normalizing equivalent board states. For (almost) every possible tic-tac-toe board, there are at least a few other tic-tac-toe boards that are essentially equivalent. You can take a given board and rotate three times or flip it along the vertical and/or horizontal axes.</p>
<p>For example, this board</p>
<pre>
   X | O |
  -----------
     | X |
  -----------
     |   | O
</pre>
<p>is, for our purposes, the same as</p>
<pre>
     |   | O              O |   |
  -----------            -----------
   O | X |        and       | X | O
  -----------            -----------
   X |   |                  |   | X
</pre>
<p>Making sure these board states were considered equivalent cut down on the amount of memory required to store the policy and, consequently, the amount of time required to generate an effective policy.</p>
<p>To accomplish the normalization, the choosing function turns the board state into a string. The string representation of this board (from the <em>X</em>'s point of view):</p>
<pre>
   X | O |
  -----------
     | X |
  -----------
     |   | O
</pre>
<p>is <code>AB--A---B</code>. (<em>A</em>s represent a player's own symbol while <em>B</em>s represent the opponent's. From the <em>O</em>'s point of view, the board would be represented as <code>BA--B---A</code>.) It then checks the matrix for any equivalent permutations by rotating and flipping the board. The following board states are equivalent to the board above, for example.</p>
<p>If it finds a permutation, it remembers how many rotations and flips it used so that it can apply the same transformations to the move it selects - "translating", so to speak, the moves between the actual board and the permutation.</p>
<p>See it in action at <a href="https://tbaldw.in/tictactoe">tbaldw.in/tictactoe</a>. Check out the code at <a href="https://github.com/rolyatmax/tictactoe">github.com/rolyatmax/tictactoe</a>. It's a bit messy in parts (as it has changed tremendously over time), but the meat of the learning algorithm is in <code>public/js/Q.js</code>. For more info about how Q-Learning works, check out the <a href="http://en.wikipedia.org/wiki/Q-learning">Wikipedia article</a>.</p>
`
