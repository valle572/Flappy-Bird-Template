// Setup ==========================================================================================

// Elements
const endScreen     = document.querySelector('.end-screen');
const currScoreText = document.querySelector('.current-score-text');
const endScoreText  = document.querySelector('.end-score-text');
const highScoreText = document.querySelector('.high-score-text');

// Objects
const gameArea = getObject('main');
const bird     = getObject('.bird');
const pipe     = getObject('.pipe');

/**
 * Summary: Accepts a CSS selector and returns an object containing the element alongside its
 *          bounding rectangle
 * 
 * Input:  String
 * Output: Object
 */
function getObject(selector) {
  const obj = { elem: document.querySelector(selector) };
  updateRect(obj);
  return obj;
}

/**
 * Summary: Updates the bounding rectangle of object. If object does not have properties, it sets
 *          them
 * 
 * Input:  Object (with element in elem property)
 * Output: None
 */
function updateRect(obj) {
  const rect = obj.elem.getBoundingClientRect();
  
  obj.width  = rect.width;
  obj.height = rect.height;
  obj.top    = rect.top;
  obj.right  = rect.right;
  obj.bottom = rect.bottom;
  obj.left   = rect.left;
}

// Game
let highScore     = localStorage.getItem('HIGH_SCORE') || 0;
let currScore     = 0;
let prevTime      = null; // requestAnimationFrame previous frame time
let frameID       = null; // requestAnimationFrame current frame ID

// Bird
let maxJumpHeight = gameArea.height / 5;
let jumpDuration  = 0.5; // time of flight in seconds
let g             = 8 * maxJumpHeight / (jumpDuration ** 2); // gravity
bird.jumpVel      = 4 * maxJumpHeight / jumpDuration; // initial jump velocity
bird.gotPoint     = false; // bird got point for current pipe
bird.isJumping    = true; // bird is jumping during current frame

// Pipe
pipe.speed        = gameArea.width / 2;
pipe.gapHeight    = gameArea.height / 3; // height of gap between top and bottom pipe

// Event Listeners
window.addEventListener('resize', optimizeScreen);
document.addEventListener('keydown', handleJump);
document.addEventListener('keydown', startGame, {once: true});

// Game Loop ======================================================================================

function gameLoop(currTime) {
  if (prevTime) { // skip first frame to have a previous frame time
    const delta = (currTime - prevTime) / 1000; // time since last frame in seconds
    updateBird(delta);
    updatePipe(delta);
    if (collision()) return endGame();
    manageScore();
  }
  prevTime = currTime;
  frameID  = requestAnimationFrame(gameLoop);
}

// Helper Functions ===============================================================================

/**
 * Summary: Prepares game then begins game loop
 * 
 * Input:  None
 * Output: None
 */
function startGame() {
  if (prevTime) resetGameVars(); // if not first game, reset game variables
  newPipeGap();

  currScoreText.textContent = '0';
  endScreen.classList.add('hidden');

  frameID = requestAnimationFrame(gameLoop);
}

/**
 * Summary: Updates high score when needed, displays ending score and high score, shows end screen,
 *          and allows game to be restarted
 * 
 * Input:  None
 * Output: None
 */
function endGame() {
  cancelAnimationFrame(frameID);

  if (currScore > highScore) { // update high score if surpassed
    highScore = currScore;
    localStorage.setItem('HIGH_SCORE', highScore);
  }
  endScoreText.textContent  = `Your Score: ${currScore}`;
  highScoreText.textContent = `High Score: ${highScore}`;

  setTimeout(() => { // waiting helps prevent accidentally starting new game
    document.addEventListener('keydown', startGame, {once: true});
    endScreen.classList.remove('hidden');
  }, 250);
}

/**
 * Summary: Returns whether bird has collided with ceiling, floor, or pipe
 * 
 * Input:  None
 * Output: True OR false
 */
function collision() {
  // bird hits ceiling or floor
  if ((bird.top < gameArea.top) || (bird.bottom > gameArea.bottom)) return true;

  // bird is safe on the left or right of pipe
  if ((bird.right < pipe.left) || (bird.left > pipe.right)) return false;

  // return whether bird hits a pipe
  return ((bird.top < pipe.gapTop) || (bird.bottom > pipe.gapBottom));
}

/**
 * Summary: Adds score when necessary
 * 
 * Input:  None
 * Output: None
 */
function manageScore() {
  // if bird already got the point for the current pipe or if it hasn't passed the pipe, nothing
  // needs to be done
  if (bird.gotPoint || (bird.left < pipe.right)) return;
  // otherwise, add 1 to the score then update the score text
  currScoreText.textContent = ++currScore;
  bird.gotPoint = true;
}

/**
 * Summary: Resets game variables for new game
 * 
 * Input:  None
 * Output: None
 */
function resetGameVars() {
  bird.elem.style.transform = 'translate3d(0, 45vh, 0)'; // back to center
  pipe.elem.style.transform = 'none'; // back to right of game area
  bird.isJumping            = true;
  bird.gotPoint             = false;
  prevTime                  = null;
  currScore                 = 0;

  // reset bounding rectangles
  updateRect(bird);
  updateRect(pipe);
}


/**
 * Summary: Decides if bird will jump based on which key is pressed
 * 
 * Input:  Event (keydown)
 * Output: None
 */
function handleJump(e) {
  if (e.code === 'Space') bird.isJumping = true;
}

/**
 * Summary: Updates bird position since last frame
 * 
 * Input:  Number (time since last frame)
 * Output: None
 */
function updateBird(delta) {
  if (bird.isJumping) {
    bird.jumpOrigin = bird.top; // initial height of jump
    bird.isJumping  = false;
    bird.jumpTime   = 0; // time since last jump
  }
  else {
    bird.jumpTime += delta;
    // vertical position = h + vt - g(t^2)/2 | But upside down since y-value increases on way down
    bird.top = bird.jumpOrigin - (bird.jumpVel * bird.jumpTime) + (g * (bird.jumpTime ** 2) / 2);
    bird.bottom = bird.top + bird.height;
    bird.elem.style.transform = `translate3d(0, ${bird.top}px, 0)`;
  }
}



/**
 * Summary: Updates pipe position since last frame and resets pipe with new gap position when
 *          necessary
 * 
 * Input:  Number (time since last frame)
 * Output: None
 */
function updatePipe(delta) {
  const displacement = pipe.speed * delta;

  if (pipe.right - displacement <= gameArea.left) { // reset pipe if it is outside of the game area
    pipe.left     = gameArea.right;
    pipe.right    = pipe.left + pipe.width;
    bird.gotPoint = false;
    newPipeGap();
  }
  else { // otherwise, move pipe left
    pipe.left  -= displacement;
    pipe.right -= displacement;
  }
  pipe.elem.style.transform = `translate3d(${pipe.left - gameArea.right}px, 0, 0)`;
}

/**
 * Summary: Sets new pipe gap in random position
 * 
 * Input:  None
 * Output: None
 */
function newPipeGap() {
  // collective minimum height of pipes
  const buffer   = pipe.gapHeight / 2;
  // randomly set gap position, adding minimum pipe size to both top and bottom pipes
  pipe.gapTop    = (Math.random() * (gameArea.height - pipe.gapHeight - buffer)) + (buffer / 2);
  pipe.gapBottom = pipe.gapTop + pipe.gapHeight;
  // the top border is the top pipe and the bottom border is the bottom pipe
  pipe.elem.style.borderWidth = `${pipe.gapTop}px 0 ${gameArea.bottom - pipe.gapBottom}px 0`;
}



/**
 * Summary: Redefines values for new screen dimensions
 * 
 * Input:  None
 * Output: None
 */
function optimizeScreen() {
  updateRect(gameArea);
  updateRect(bird);
  updateRect(pipe);
  pipe.gapHeight = gameArea.height / 3;
  pipe.speed     = gameArea.width  / 2;
  maxJumpHeight  = gameArea.height / 5;
  g              = 8 * maxJumpHeight / (jumpDuration ** 2);
  bird.jumpVel   = 4 * maxJumpHeight / jumpDuration;
}