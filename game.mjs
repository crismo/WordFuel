const DEBUG = true;
const USE_VALIDAITON = false;
const dictionaryFile = "lists/no.txt"; // 
const allowedWords = parseLanguageFile(await loadFile(dictionaryFile));
const challengeFile = "challenges/challenge.txt";
const allChallenges = parseChallengeFile(await loadFile(challengeFile));
const outputElement = document.getElementById("output");
const stageElement = document.getElementById("stage");
const footerElement = document.getElementById("footer");

const PROBABILITY_OF_CHALLENGE = 0.3;

const MAX_TOTAL_SCORE = 100;
const MAX_SCORE_PER_SENTENCE = 10;

const WORD_SCORES = {
    shortWord: { length: 4, score: 1 },
    mediumWord: { length: 5, score: 3 },
    longWord: { length: 7, score: 5 },
    veryLongWord: { length: 10, score: 6 }
};

const SENTANCE_SCORE_MULTIPLIERS = [
    { short: { length: 1, factor: 1 } },
    { medium: { length: 10, factor: 1.05 } },
    { long: { length: 15, factor: 1.3 } }
];


const COLORS = {
    correct: "lightgreen",
    incorrect: "lightcoral"
};


let totalScore = 0;
let isLocked = false;
let challengeBuffer = null;
let currentChallenge = null;
let challengeElement = null;
let sentences = [];


async function onPlayerInput(e) {

    if (isLocked) {
        return;
    }

    isLocked = true;

    if (["Shift", "Control", "Alt", "Meta", "Tab"].includes(e.key)) {
        isLocked = false;
        return;
    }

    if (e.key === "Backspace") {
        outputElement.textContent = outputElement.textContent.slice(0, -1);
        isLocked = false;
        return;
    }

    if (e.key === "Enter") {
        const sentence = retriveCleanSentence();
        if (isSentenceValid(sentence) && isChallengeComplete(sentence)) {
            //Valid sentence
            sentences.push(sentence);

            let score = calculateScoreForSentence(sentence);
            score *= scoreMultiplier(sentence);
            score = Math.min(score, MAX_SCORE_PER_SENTENCE);
            totalScore += score;
            displayScoreIncrease(score);

            await blink(outputElement, 3, COLORS.correct);

            if (totalScore >= MAX_TOTAL_SCORE) {
                alert("Blastoff!");
                showSummary();
            }

            runChallenge();

        } else {
            // Invalid sentence
            await blink(outputElement, 3, COLORS.incorrect);
        }

        outputElement.textContent = "";
    } else {

        // Only allow letters and space to be appebded to the output
        if (/^[a-zA-Z\sæøåÆØÅ]+$/.test(e.key)) {
            outputElement.textContent += e.key;
        }
    }

    isLocked = false;
}

function retriveCleanSentence() {
    return outputElement.textContent.trim();
}

function isChallengeComplete(sentance) {
    if (currentChallenge === null || currentChallenge == "") { return true; }
    return sentance.includes(currentChallenge);
}

function isSentenceValid(sentance) {

    // This function dos not actualy validate if a sentance is valid in the given language.
    // It only checks if the words in the sentance are in the allowed words list.
    // It dos not check if the words are in the correct order or if the sentance is gramatically correct.
    // It dos not deal with stemming, conjugation or other language specific rules.

    if (!USE_VALIDAITON) {
        return true;
    }

    if (sentance.trim().length === 0) { return false };

    let words = sentance.split(" ");

    for (const word of words) {
        if (allowedWords.hasOwnProperty(word) === false) {
            log(`Word not found in allowed words: ${word}`);
            return false;
        }
    }

    return true;
}

function calculateScoreForSentence(sentence) {
    let words = sentence.split(" ");
    let score = 0;
    for (const word of words) {
        score += calculateScoreForWord(word);
    }
    return score;
}

function calculateScoreForWord(word) {
    let score = 0;
    for (const key in WORD_SCORES) {
        if (word.length >= WORD_SCORES[key].length) {
            score = WORD_SCORES[key].score;
        }
    }
    return score;
}

function scoreMultiplier(sentence) {

    let out = SENTANCE_SCORE_MULTIPLIERS[0];

    for (const multiplier of SENTANCE_SCORE_MULTIPLIERS) {
        for (const key in multiplier) {
            if (sentence.length >= multiplier[key].length) {
                out = multiplier[key];
            }
        }
    }

    return out.factor;
}

function runChallenge() {

    if (challengeElement !== null) {
        challengeElement.remove();
        currentChallenge = null;
    }

    if (Math.random() <= PROBABILITY_OF_CHALLENGE) {
        currentChallenge = getChallenge();
        log(`New challenge: ${currentChallenge}`);
        challengeElement = document.createElement("div");
        challengeElement.style = "display: inline-block; margin: 10px; padding: 10px; background-color: lightblue; border-radius: 5px;";
        challengeElement.textContent = `${currentChallenge}`;
        outputElement.parentNode.insertBefore(challengeElement, outputElement);
    }
}

function getChallenge() {
    if (challengeBuffer === null || challengeBuffer.length === 0) {
        challengeBuffer = shuffleArray(allChallenges);
    }
    return challengeBuffer.pop();

}

function showSummary() {
    const modalContent = document.createElement("div");
    modalContent.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 9999;";

    const modalText = document.createElement("div");
    modalText.style = "background-color: white; padding: 20px; border-radius: 5px; text-align: center;";
    modalContent.appendChild(modalText);

    const longestSentenceLength = Math.max(...sentences.map(sentence => sentence.split(" ").length));
    const averageSentenceLength = sentences.reduce((total, sentence) => total + sentence.split(" ").length, 0) / sentences.length;
    const numberOfSentences = sentences.length;

    modalText.innerHTML = `
                Number of Sentences: ${numberOfSentences}<br/>
                Longest Sentence Length: ${longestSentenceLength}<br/>
                Average Sentence Length: ${averageSentenceLength}<br/>
                <ul>
                Sentences: ${sentences.map(sentence => `<li>${sentence}</li>`).join("")}
                </ul>`;

    document.body.appendChild(modalContent);

    setTimeout(() => {
        location.reload();
    }, 10000);
}


//#region  SUPPORT FUNCTIONS ----------------------------

window.addEventListener("keydown", async (e) => { e.preventDefault(); await onPlayerInput(e); });

outputElement.addEventListener("click", () => { outputElement.focus(); });


async function loadFile(file) {
    return await (await fetch(file).then(response => response.text()));
}

function parseLanguageFile(data) {

    const lines = data.split("\n");
    const list = lines.map(line => line.split(" ")[0].trim());

    log(`Parsed ${list.length} words from language file.`);

    /// NOTE: Consider ISAM for faster lookups if this is to slow.
    const words = {};
    list.forEach(word => {
        words[word] = 0;
    });

    return words;
}

function parseChallengeFile(data) {
    let challenges = data.split("\n");
    return challenges;
}

function displayScoreIncrease(score) {
    const scoreElement = document.createElement("div");
    scoreElement.textContent = `${score.toFixed(0)}`;
    scoreElement.classList.add("fade-up");
    stageElement.appendChild(scoreElement);
    setTimeout(() => {
        scoreElement.remove();
    }, 3000);

    stageElement.style.background = `linear-gradient(to top, ${COLORS.correct} ${totalScore}%, transparent ${totalScore}%)`;
    footerElement.textContent = `${((totalScore / MAX_TOTAL_SCORE) * 100).toFixed(2)}%`;
}

async function blink(element, times, color) {

    let originalColor = element.style.backgroundColor;

    for (let i = 0; i < times; i++) {
        element.style.backgroundColor = color;
        await sleep(100);
        element.style.backgroundColor = "";
        await sleep(100);
    }

    element.style.backgroundColor = originalColor;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function log(message) {
    if (DEBUG) {
        console.log(message);
    }
}

function shuffleArray(array) {
    const shuffledArray = [...array];
    for (let i = shuffledArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
    }
    return shuffledArray;
}

//#endregion