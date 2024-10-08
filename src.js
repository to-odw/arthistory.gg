document.addEventListener('DOMContentLoaded', function() {
    // Game variables
    let lives = 3;
    let correctStreak = 0;
    let score = 0;
    const correctStreakForBonusLife = 5;
    const winningScore = 10;
    const numberOfQuestions = 15; // Variable for the number of questions

    // Get DOM elements
    const paintingList = document.querySelector("[game='paintingList']");
    const gameOverElement = document.querySelector("[game='gameOver']");
    const scoreElements = document.querySelectorAll("[game='score']"); // Get all score elements
    const gameWinElement = document.querySelector("[game='gameWin']");
    const lifeCounter = document.querySelector("[game='lifeCounter']");
    const newGameButton = document.querySelector("[game='newGame']");

    let allQuizQuestionWrappers = [];
    let allArtistNames = [];

    // Initialize the game after waiting for paintingList to stabilize
    waitForPaintingListToStabilize(500).then(() => {
        selectRandomQuestionsAndInitializeGame();
        removeLoadingClass();
    });

    // Function to wait until paintingList is stable for a given duration (in ms)
    function waitForPaintingListToStabilize(duration) {
        console.log('Waiting for paintingList to stabilize...');
        return new Promise(resolve => {
            let lastChildCount = paintingList.childElementCount;
            let stabilityTimer = null;

            const checkStability = () => {
                const currentChildCount = paintingList.childElementCount;
                if (currentChildCount === lastChildCount) {
                    if (stabilityTimer === null) {
                        stabilityTimer = setTimeout(() => {
                            console.log('paintingList is stable.');
                            resolve();
                        }, duration);
                    }
                } else {
                    clearTimeout(stabilityTimer);
                    stabilityTimer = null;
                    lastChildCount = currentChildCount;
                }
                requestAnimationFrame(checkStability);
            };

            checkStability();
        });
    }

    // Function to remove 'is-loading' class from quizQuestionWrapper elements and loading element
    function removeLoadingClass() {
        console.log('Removing is-loading class from quizQuestionWrapper elements and loading element.');
        const quizQuestionWrappers = paintingList.querySelectorAll("[game='quizQuestionWrapper']");
        quizQuestionWrappers.forEach(wrapper => wrapper.classList.remove('is-loading'));

        // Remove 'is-loading' class from the loading element
        const loadingElement = document.querySelector("[game='loading']");
        if (loadingElement) {
            loadingElement.classList.remove('is-loading');
        }
    }

    // Function to select random questions and initialize the game
    function selectRandomQuestionsAndInitializeGame() {
        console.log('Selecting random questions and initializing game...');
        // Get all quizQuestionWrappers
        const allQuestions = Array.from(paintingList.querySelectorAll("[game='quizQuestionWrapper']"));
        console.log(`Total quiz questions available before selection: ${allQuestions.length}`);

        // Collect all artist names from the game='option1Text' content
        allArtistNames = allQuestions
            .map(q => {
                const option1TextElement = q.querySelector("[game='option1Text']");
                if (option1TextElement) {
                    return option1TextElement.textContent.trim();
                } else {
                    console.warn('option1Text not found in a question during artist name collection.');
                    return null;
                }
            })
            .filter(artist => artist);
        // Remove duplicates
        allArtistNames = [...new Set(allArtistNames)];
        console.log(`Total unique artist names collected: ${allArtistNames.length}`);

        // Randomly select the desired number of quizQuestionWrappers
        shuffleArray(allQuestions);
        const selectedQuestions = allQuestions.slice(0, numberOfQuestions);

        console.log(`Selected ${selectedQuestions.length} questions for the game.`);

        // Remove all other quizQuestionWrapper elements from the DOM
        const selectedQuestionSet = new Set(selectedQuestions);
        allQuestions.forEach(question => {
            if (!selectedQuestionSet.has(question)) {
                question.remove();
            }
        });

        // Update the global variable
        allQuizQuestionWrappers = selectedQuestions;

        // Randomize the order of selectedQuestions
        shuffleArray(allQuizQuestionWrappers);

        // Set up options for each question
        allQuizQuestionWrappers.forEach(question => setupQuestionOptions(question));

        // Start the game
        initGame();
    }

    // Initialize the game
    function initGame() {
        console.log('Initializing game variables...');
        lives = 3;
        correctStreak = 0;
        score = 0;

        initializeLivesUI();
        updateLivesUI();
        updateScoreUI();

        console.log('Game is ready to start.');
    }

    // Function to initialize the lives UI
    function initializeLivesUI() {
        lifeCounter.innerHTML = '';
        for (let i = 0; i < lives; i++) {
            let life = document.createElement('div');
            life.classList.add('is-life');
            lifeCounter.appendChild(life);
        }
    }

    // Function to reset the game state without changing the questions
    function resetGameState() {
        console.log('Resetting game state...');
        lives = 3;
        correctStreak = 0;
        score = 0;
        updateLivesUI();
        updateScoreUI();

        // Remove 'is-guessed', 'is-correct', 'is-incorrect' classes from options and quizQuestionWrappers
        allQuizQuestionWrappers.forEach(quizQuestionWrapper => {
            quizQuestionWrapper.classList.remove('is-guessed');
            const options = {};
            for (let i = 1; i <= 6; i++) {
                options[i] = quizQuestionWrapper.querySelector(`[game='option${i}']`);
                if (options[i]) {
                    options[i].classList.remove('is-correct', 'is-incorrect', 'is-disabled');
                    options[i].disabled = false; // Re-enable options
                }
            }
            // Re-setup option 5 state
            const option5Element = options[5];
            if (option5Element) {
                updateOption5State(option5Element);
            }
        });

        // Hide game over and win screens if they are visible
        gameOverElement.classList.remove('show');
        gameWinElement.classList.remove('show');

        console.log('Game has been reset.');
    }

    // Setup options for each question
    function setupQuestionOptions(quizQuestionWrapper) {
        // The correct artist is assumed to be the text content of option1Text before shuffling
        let correctArtistElement = quizQuestionWrapper.querySelector("[game='option1Text']");
        const correctArtist = correctArtistElement ? correctArtistElement.textContent.trim() : '';
        console.log(`Setting up options for question with correct artist: ${correctArtist}`);

        // Get the option buttons and texts within this quizQuestionWrapper
        const options = {};
        const optionTexts = {};
        for (let i = 1; i <= 6; i++) {
            options[i] = quizQuestionWrapper.querySelector(`[game='option${i}']`);
            optionTexts[i] = options[i] ? options[i].querySelector(`[game='option${i}Text']`) : null;
        }

        // Check if optionTexts are correctly selected
        for (let i = 1; i <= 6; i++) {
            if (!optionTexts[i]) {
                console.warn(`option${i}Text not found in the question.`);
            }
        }

        // Create a list of wrong artist names by excluding the correct artist
        const wrongArtistNames = allArtistNames.filter(artist => artist !== correctArtist);

        // Shuffle wrong artist names
        shuffleArray(wrongArtistNames);

        // Pick 3 wrong artists
        const selectedWrongArtists = wrongArtistNames.slice(0, 3);

        // Combine the correct artist and wrong artists
        const answerOptions = [correctArtist, ...selectedWrongArtists];

        // Shuffle the answer options
        shuffleArray(answerOptions);

        console.log(`Answer options (shuffled):`, answerOptions);

        // Assign answer options to options 1-4
        for (let i = 1; i <= 4; i++) {
            if (optionTexts[i]) {
                optionTexts[i].textContent = answerOptions[i - 1];
                console.log(`option${i}Text set to: ${answerOptions[i - 1]}`);
            } else {
                console.warn(`option${i}Text element is missing.`);
            }
            options[i].dataset.correct = (answerOptions[i - 1] === correctArtist).toString();
            options[i].classList.remove('is-correct', 'is-incorrect');
        }

        // Set up options 5 and 6 without changing their text
        options[5].dataset.correct = 'false';
        options[5].classList.remove('is-correct', 'is-incorrect');

        options[6].dataset.correct = 'false';
        options[6].classList.remove('is-correct', 'is-incorrect');

        // Remove any disabling of option 5
        updateOption5State(options[5]);

        // Set up event listeners for options
        for (let i = 1; i <= 6; i++) {
            options[i].addEventListener('click', function() {
                handleOptionSelect(i, quizQuestionWrapper);
            });
            options[i].addEventListener('keydown', function(event) {
                if (event.key === 'Enter') {
                    handleOptionSelect(i, quizQuestionWrapper);
                }
            });
        }
    }

    // Update option5 (Skip Question) state (now always enabled)
    function updateOption5State(option5Element) {
        console.log('Ensuring Option5 (Skip Question) is enabled.');
        // Option 5 is always enabled now
        option5Element.disabled = false;
        option5Element.classList.remove('is-disabled');
    }

    // Handle option selection
    function handleOptionSelect(optionIndex, quizQuestionWrapper) {
        // Allow option6 to function even if game is over
        if ((lives <= 0 || score >= winningScore) && optionIndex !== 6) {
            // Do nothing if game is over or won, unless option6 is selected
            console.log('Game is over or won. Input ignored.');
            return;
        }

        const options = {};
        for (let i = 1; i <= 6; i++) {
            options[i] = quizQuestionWrapper.querySelector(`[game='option${i}']`);
        }

        if (optionIndex >= 1 && optionIndex <= 4) {
            const isCorrect = options[optionIndex].dataset.correct === 'true';
            if (isCorrect) {
                console.log(`Correct answer selected: Option ${optionIndex}`);
                options[optionIndex].classList.add('is-correct');
                correctStreak++;
                score++;
                updateScoreUI();

                if (correctStreak % correctStreakForBonusLife === 0) {
                    lives++;
                    updateLivesUI();
                }

                setTimeout(() => {
                    quizQuestionWrapper.classList.add('is-guessed');
                    checkIfGameOverOrWon();
                }, 500); // Wait 500ms before adding 'is-guessed' class
            } else {
                console.log(`Incorrect answer selected: Option ${optionIndex}`);
                options[optionIndex].classList.add('is-incorrect');
                lives--;
                correctStreak = 0;
                updateLivesUI();
                // Option 5 remains enabled regardless of lives
                // Do not add 'is-guessed' class
                checkIfGameOverOrWon();
            }
        } else if (optionIndex === 5) {
            console.log('Skipping question. Deducting one life.');
            // Skip question
            lives--;
            updateLivesUI();
            correctStreak = 0;

            quizQuestionWrapper.classList.add('is-guessed');
            checkIfGameOverOrWon();
        } else if (optionIndex === 6) {
            // Start over the game with the same questions
            console.log('Starting over the game.');
            resetGameState();
        }
    }

    // Check if game is over or won
    function checkIfGameOverOrWon() {
        if (lives <= 0) {
            console.log('Game over due to zero lives.');
            showGameOver();
        } else if (score >= winningScore) {
            console.log('Player has won the game!');
            showGameWin();
        }
    }

    // Show game over screen
    function showGameOver() {
        console.log('Showing game over screen.');
        // Hide multiple choice UI and show painting facts
        hideMultipleChoiceUI();
        showPaintingFacts();
        paintingList.classList.add('game-is-over');
        gameOverElement.classList.add('show');
    }

    // Show game win screen
    function showGameWin() {
        console.log('Showing game win screen.');
        // Hide multiple choice UI and show painting facts
        hideMultipleChoiceUI();
        showPaintingFacts();
        paintingList.classList.add('game-is-over');
        gameWinElement.classList.add('show');
    }

    // Hide multiple choice UI
    function hideMultipleChoiceUI() {
        console.log('Hiding multiple choice UI.');
        const multipleChoiceWrappers = paintingList.querySelectorAll("[game='multipleChoiceWrapper']");
        multipleChoiceWrappers.forEach(wrapper => wrapper.classList.add('hide'));
    }

    // Show painting facts
    function showPaintingFacts() {
        console.log('Showing painting facts.');
        const paintingFacts = paintingList.querySelectorAll("[game='paintingFacts']");
        paintingFacts.forEach(fact => fact.classList.add('show'));
    }

    // Update lives in the UI
    function updateLivesUI() {
        console.log(`Updating lives UI. Lives remaining: ${lives}`);

        const lifeElements = lifeCounter.querySelectorAll('.is-life');

        // If there are fewer life elements than lives, add more life elements
        while (lifeElements.length < lives) {
            let life = document.createElement('div');
            life.classList.add('is-life');
            lifeCounter.appendChild(life);
            lifeElements = lifeCounter.querySelectorAll('.is-life');
        }

        // Update the classes based on lives
        lifeElements.forEach((lifeElement, index) => {
            if (index < lives) {
                lifeElement.classList.remove('is-lost');
            } else {
                lifeElement.classList.add('is-lost');
            }
        });

        // No need to update option 5 state, as it's always enabled
    }

    // Update score in the UI
    function updateScoreUI() {
        console.log(`Updating score UI. Current score: ${score}`);
        scoreElements.forEach(scoreElement => {
            scoreElement.textContent = score;
        });
    }

    // Utility function to shuffle an array
    function shuffleArray(array) {
        // Fisher-Yates shuffle algorithm
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // Event listener for keyboard input (keys 1-6)
    document.addEventListener('keydown', function(event) {
        const key = event.key;
        if (key >= '1' && key <= '6') {
            const optionIndex = parseInt(key);
            const activeQuestions = paintingList.querySelectorAll("[game='quizQuestionWrapper']:not(.is-guessed)");
            let currentQuestion;
            if (activeQuestions.length > 0) {
                currentQuestion = activeQuestions[0];
            } else {
                // If no active questions, and game over, but option6 is selected
                if (optionIndex === 6) {
                    currentQuestion = paintingList.querySelector("[game='quizQuestionWrapper']");
                } else {
                    return;
                }
            }

            const options = {};
            for (let i = 1; i <= 6; i++) {
                options[i] = currentQuestion.querySelector(`[game='option${i}']`);
            }
            if (options[optionIndex]) {
                options[optionIndex].click();
            }
        }
    });

    // Event listener for new game button
    if (newGameButton) {
        newGameButton.addEventListener('click', function() {
            console.log('New game button clicked. Starting a new game.');
            location.reload();
        });
    }
});
