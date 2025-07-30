const ASSET_PATHS = {
    images: "./src/assets/icons/",
    audios: "./src/assets/audios/",
    cardBack: "./src/assets/icons/card-back.png",
    bgm: "./src/assets/audios/egyptian_duel.mp3"
};

const CARD_COUNT = 5;
const MAX_SCORE = 10;

const state = {
    score: {
        playerScore: 0,
        computerScore: 0,
        scoreDisplay: document.getElementById('score_points')
    },
    cardSprites: {
        avatar: document.getElementById('card-image'),
        name: document.getElementById('card-name'),
        type: document.getElementById('card-type')
    },
    fieldCards: {
        player: document.getElementById('player-field-card'),
        computer: document.getElementById('computer-field-card')
    },
    playerSides: {
        player: {
            id: "player-cards",
            container: document.querySelector("#player-cards")
        },
        computer: {
            id: "computer-cards",
            container: document.querySelector("#computer-cards")
        }
    },
    actions: {
        button: document.getElementById("next-duel"),
        audioToggle: document.getElementById("audio-toggle")
    },
    audio: {
        isMuted: false,
        bgm: document.getElementById("bgm")
    },
    isProcessing: false
};

const cardData = [
  {
    id: 0,
    name: "Blue Eyes White Dragon",
    type: "Paper",
    img: `${pathImages}dragon.png`,
    winOf: [1],
    loseOf: [2],
  },
  {
    id: 1,
    name: "Dark Magician",
    type: "Rock",
    img: `${pathImages}magician.png`,
    winOf: [2],
    loseOf: [0],
  },
  {
    id: 2,
    name: "Exodia",
    type: "Scissors",
    img: `${pathImages}exodia.png`,
    winOf: [0],
    loseOf: [1],
  },
];

const audioCache = {
    win: new Audio(`${ASSET_PATHS.audios}win.wav`),
    lose: new Audio(`${ASSET_PATHS.audios}lose.wav`),
    bgm: state.audio.bgm
};

// Pré-carregamento de assets
async function preloadAssets() {
    const imagePromises = cardData.map(card => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = card.img;
            img.onload = resolve;
            img.onerror = () => reject(`Failed to load image: ${card.img}`);
        });
    });

    const audioPromises = Object.values(audioCache).map(audio => {
        return new Promise((resolve, reject) => {
            audio.src = audio.src || ASSET_PATHS.bgm;
            audio.oncanplaythrough = resolve;
            audio.onerror = () => reject(`Failed to load audio: ${audio.src}`);
        });
    });

    try {
        await Promise.all([...imagePromises, ...audioPromises]);
        hideLoadingScreen();
    } catch (error) {
        console.error("Asset preload failed:", error);
        hideLoadingScreen();
        showErrorMessage("Erro ao carregar assets. O jogo pode funcionar sem alguns recursos.");
    }
}

// Esconder tela de carregamento
function hideLoadingScreen() {
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
        loadingScreen.style.display = "none";
    }
}

// Exibir mensagem de erro
function showErrorMessage(message) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message framed";
    errorDiv.innerHTML = `<p>${message}</p>`;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

// Controle de áudio
function toggleAudio() {
    state.audio.isMuted = !state.audio.isMuted;
    state.audio.bgm.muted = state.audio.isMuted;
    Object.values(audioCache).forEach(audio => audio.muted = state.audio.isMuted);
    state.actions.audioToggle.textContent = state.audio.isMuted ? "🔇" : "🔊";
    state.actions.audioToggle.setAttribute("aria-label", state.audio.isMuted ? "Ativar áudio" : "Desativar áudio");
}

// Ajuste dinâmico de tamanhos de cartas
function adjustCardSizes() {
    const cards = document.querySelectorAll('.card');
    const cardHeight = window.innerWidth <= 600 ? '80px' : window.innerWidth <= 1024 ? '90px' : '100px';
    cards.forEach(card => card.setAttribute('height', cardHeight));
}

// Geração de ID de carta aleatória
function getRandomCardId() {
    const randomIndex = Math.floor(Math.random() * cardData.length);
    return cardData[randomIndex].id;
}

// Criação de imagem de carta
function createCardImage(cardId, side) {
    if (!state.playerSides[side]?.container) {
        throw new Error(`Container for ${side} not found`);
    }

    const cardImage = document.createElement("img");
    cardImage.setAttribute("height", window.innerWidth <= 600 ? "80px" : "100px");
    cardImage.setAttribute("src", ASSET_PATHS.cardBack);
    cardImage.setAttribute("data-id", cardId);
    cardImage.classList.add("card");

    if (side === "player") {
        cardImage.addEventListener("mouseover", () => displayCardDetails(cardId));
        cardImage.addEventListener("click", () => handleCardSelection(cardId));
        cardImage.addEventListener("touchstart", (e) => {
            e.preventDefault();
            handleCardSelection(cardId);
        }, { passive: false });
    }

    return cardImage;
}

// Seleção de carta pelo jogador
async function handleCardSelection(cardId) {
    if (state.isProcessing) return;
    state.isProcessing = true;

    try {
        cardId = parseInt(cardId);
        await removeAllCards();
        const computerCardId = getRandomCardId();
        showCardFields(true);
        clearCardDetails();
        renderCardsInField(cardId, computerCardId);
        const duelResult = await checkDuelResults(cardId, computerCardId);
        updateUI(duelResult);
    } catch (error) {
        console.error("Error in card selection:", error);
        showErrorMessage("Erro ao processar a seleção de carta.");
    } finally {
        state.isProcessing = false;
    }
}

// Exibição de detalhes da carta
function displayCardDetails(cardId) {
    const card = cardData[cardId];
    if (!card || !state.cardSprites.avatar) return;

    state.cardSprites.avatar.src = card.img;
    state.cardSprites.name.textContent = card.name;
    state.cardSprites.type.textContent = `Attribute: ${card.type}`;
}

// Limpeza de detalhes da carta
function clearCardDetails() {
    if (!state.cardSprites.avatar) return;

    state.cardSprites.avatar.src = "";
    state.cardSprites.name.textContent = "Card Name";
    state.cardSprites.type.textContent = "Attribute: ";
}

// Exibição de cartas no campo
function renderCardsInField(playerCardId, computerCardId) {
    if (!state.fieldCards.player || !state.fieldCards.computer) {
        throw new Error("Field card elements not found");
    }

    state.fieldCards.player.src = cardData[playerCardId].img;
    state.fieldCards.computer.src = cardData[computerCardId].img;
}

// Mostrar/esconder cartas no campo
function showCardFields(show) {
    if (!state.fieldCards.player || !state.fieldCards.computer) return;

    const display = show ? "block" : "none";
    state.fieldCards.player.style.display = display;
    state.fieldCards.computer.style.display = display;
}

// Atualização da interface
function updateUI(duelResult) {
    if (!state.score.scoreDisplay || !state.actions.button) return;

    state.score.scoreDisplay.textContent = `Vitórias: ${state.score.playerScore} | Derrotas: ${state.score.computerScore}`;
    state.actions.button.textContent = duelResult.toUpperCase();
    state.actions.button.style.display = "block";
    state.actions.button.setAttribute("aria-label", `Resultado: ${duelResult}`);
}

// Verificação de resultados do duelo
async function checkDuelResults(playerCardId, computerCardId) {
    const playerCard = cardData[playerCardId];
    let duelResult = "draw";

    if (playerCard.winOf.includes(computerCardId)) {
        duelResult = "win";
        state.score.playerScore++;
        await playAudio("win");
    } else if (playerCard.loseOf.includes(computerCardId)) {
        duelResult = "lose";
        state.score.computerScore++;
        await playAudio("lose");
    }

    if (state.score.playerScore >= MAX_SCORE || state.score.computerScore >= MAX_SCORE) {
        endGame();
    }

    return duelResult;
}

// Fim de jogo
function endGame() {
    if (!state.actions.button) return;

    state.actions.button.disabled = true;
    const message = state.score.playerScore >= MAX_SCORE ? "Você venceu!" : "O computador venceu!";
    const endGameModal = document.createElement("div");
    endGameModal.className = "end-game-modal";
    endGameModal.innerHTML = `
        <div class="modal-content framed">
            <h2>🏁 Fim de Jogo!</h2>
            <p>${message}</p>
            <button class="rpgui-button" onclick="resetDuel()">Jogar Novamente</button>
        </div>
    `;
    document.body.appendChild(endGameModal);
}

// Remoção de todas as cartas
function removeAllCards() {
    ["player", "computer"].forEach(side => {
        const container = state.playerSides[side].container;
        if (container) {
            container.innerHTML = "";
        }
    });
}

// Desenho de cartas iniciais
function drawCards(count, side) {
    const container = state.playerSides[side].container;
    if (!container) {
        throw new Error(`Container for ${side} not found`);
    }

    for (let i = 0; i < count; i++) {
        const cardId = getRandomCardId();
        const cardImage = createCardImage(cardId, side);
        container.appendChild(cardImage);
    }
}

// Reinício do duelo
function resetDuel() {
    const modal = document.querySelector(".end-game-modal");
    if (modal) modal.remove();

    state.cardSprites.avatar.src = "";
    state.actions.button.style.display = "none";
    showCardFields(false);
    removeAllCards();
    drawCards(CARD_COUNT, "player");
    drawCards(CARD_COUNT, "computer");
}

// Reprodução de áudio
async function playAudio(status) {
    if (state.audio.isMuted) return;

    const audio = audioCache[status];
    if (!audio) return;

    try {
        audio.volume = window.innerWidth <= 600 ? 0.15 : 0.2;
        await audio.play();
    } catch (error) {
        console.error(`Error playing audio (${status}):`, error);
    }
}

// Inicialização do jogo
async function initGame() {
    if (!state.score.scoreDisplay || !state.actions.button || !state.audio.bgm || !state.actions.audioToggle) {
        throw new Error("Required DOM elements or audio not found");
    }

    state.actions.audioToggle.addEventListener("click", toggleAudio);
    await preloadAssets();
    showCardFields(false);
    drawCards(CARD_COUNT, "player");
    drawCards(CARD_COUNT, "computer");

    if (!state.audio.isMuted && state.audio.bgm.paused) {
        state.audio.bgm.volume = window.innerWidth <= 600 ? 0.2 : 0.3;
        state.audio.bgm.play().catch(error => {
            console.error("Error playing BGM:", error);
            showErrorMessage("Clique em uma carta para iniciar a música.");
            state.actions.button.addEventListener("click", () => {
                if (!state.audio.isMuted) {
                    state.audio.bgm.play().catch(err => console.error("BGM retry failed:", err));
                }
            }, { once: true });
        });
    }

    window.addEventListener("resize", adjustCardSizes);
}

// Inicialização
initGame();
