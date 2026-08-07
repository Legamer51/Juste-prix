document.addEventListener('DOMContentLoaded', () => {
    // Cartes cliquables
    const clickableCards = document.querySelectorAll('.clickable-card');
    clickableCards.forEach(card => {
        card.addEventListener('click', (e) => {
            // Ne pas naviguer si on clique sur un lien (pour permettre la navigation normale)
            if (e.target.tagName === 'A') {
                return;
            }
            const link = card.getAttribute('data-link');
            if (link) {
                window.location.href = link;
            }
        });
    });

    // Bouton de retour
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            // Si l'utilisateur a un historique de navigation, revenir en arrière.
            // Sinon, renvoyer vers l'accueil (chemin relatif depuis les pages).
            if (document.referrer && document.referrer !== '') {
                history.back();
            } else {
                const goto = (location.pathname.includes('/page/')) ? '../index.html' : 'index.html';
                window.location.href = goto;
            }
        });
    }

    const tabButtons = document.querySelectorAll('.tab-switcher button');
    const tabContents = document.querySelectorAll('.tab-content');
    const createGameForm = document.getElementById('create-game-form');
    const joinGameForm = document.getElementById('join-game-form');
    const createGameMessage = document.getElementById('create-game-message');
    const joinGameMessage = document.getElementById('join-game-message');
    const generatedRoomCode = document.getElementById('room-code');
    const roomInfo = document.getElementById('room-info');
    const roomPanel = document.getElementById('room-panel');
    const roomHost = document.getElementById('room-host');
    const roomDifficulty = document.getElementById('room-difficulty');
    const roomRound = document.getElementById('room-round');
    const roomCodeDisplay = document.getElementById('room-code-display');
    const roomStateMessage = document.getElementById('room-state-message');
    const roomGuessForm = document.getElementById('room-guess-form');
    const roomGuessInput = document.getElementById('room-guess');
    const roomGameMessage = document.getElementById('room-game-message');
    const roomAttemptsCount = document.getElementById('room-attempts-count');
    const roomResetButton = document.getElementById('room-reset-button');
    const hostControls = document.getElementById('host-controls');
    const relaunchForm = document.getElementById('relaunch-form');
    const relaunchDifficulty = document.getElementById('relaunch-difficulty');

    let currentPlayer = null;

    function markSiteAccess() {
        const existingToken = localStorage.getItem('aura-site-access');
        const accessToken = existingToken || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        sessionStorage.setItem('aura-site-access', accessToken);
        localStorage.setItem('aura-site-access', accessToken);
    }

    function hasSiteAccess() {
        const storedToken = sessionStorage.getItem('aura-site-access');
        const browserToken = localStorage.getItem('aura-site-access');
        return Boolean(storedToken && browserToken && storedToken === browserToken);
    }

    markSiteAccess();

    function setActiveTab(tabName) {
        tabButtons.forEach(button => {
            const isActive = button.dataset.tab === tabName;
            button.classList.toggle('tab-button--active', isActive);
            button.setAttribute('aria-selected', isActive);
        });

        tabContents.forEach(content => {
            content.classList.toggle('hidden', content.dataset.tab !== tabName);
        });
    }

    function generateRoomCode() {
        return String(Math.floor(1000 + Math.random() * 9000));
    }

    function getDifficultyConfig(difficulty) {
        switch (difficulty) {
            case 'moyen':
                return { maxValue: 100, limitAttempts: 10 };
            case 'difficile':
                return { maxValue: 1000, limitAttempts: 10 };
            default:
                return { maxValue: 100, limitAttempts: Infinity };
        }
    }

    function getOnlineRoom() {
        try {
            return JSON.parse(localStorage.getItem('aura-online-room')) || null;
        } catch (error) {
            return null;
        }
    }

    function saveOnlineRoom(room) {
        localStorage.setItem('aura-online-room', JSON.stringify(room));
    }

    function showRoomMessage(element, text, status = 'info') {
        if (!element) return;
        element.textContent = text;
        element.dataset.status = status;
    }

    function updateRoomSummary(room) {
        if (generatedRoomCode) generatedRoomCode.textContent = room.code;
        if (roomCodeDisplay) roomCodeDisplay.textContent = room.code;
        if (roomHost) roomHost.textContent = room.host;
        if (roomDifficulty) roomDifficulty.textContent = room.difficulty;
        if (roomRound) roomRound.textContent = String(room.round);
        if (roomInfo) roomInfo.textContent = `Partie active : ${room.difficulty} | Code ${room.code} | Chef : ${room.host}`;
    }

    function resetRoomInterface(room) {
        if (!roomPanel) return;
        roomPanel.classList.remove('hidden');
        if (roomGuessInput) {
            roomGuessInput.disabled = false;
            roomGuessInput.value = '';
        }
        if (roomGameMessage) roomGameMessage.textContent = 'Devine le nombre. Le premier qui trouve gagne !';
        if (roomAttemptsCount) roomAttemptsCount.textContent = `Essais : ${room.attempts}`;
        if (roomStateMessage) roomStateMessage.textContent = `Partie en cours - ${room.difficulty}`;
        if (roomResetButton) roomResetButton.classList.toggle('hidden', !currentPlayer || currentPlayer !== room.host);
        if (hostControls) hostControls.classList.toggle('hidden', !currentPlayer || currentPlayer !== room.host);
        if (relaunchDifficulty) relaunchDifficulty.value = room.difficulty;
    }

    function setRoomState(room) {
        if (!roomPanel) return;
        if (room.status === 'ended') {
            if (room.winner) {
                if (roomGameMessage) roomGameMessage.textContent = `Bravo ${room.winner} ! Le premier qui trouve a gagné.`;
                if (roomStateMessage) roomStateMessage.textContent = `Partie terminée`;
            } else {
                if (roomGameMessage) roomGameMessage.textContent = `La partie est terminée. Le chef peut relancer une nouvelle partie.`;
                if (roomStateMessage) roomStateMessage.textContent = `Partie terminée`;
            }
            if (roomGuessInput) roomGuessInput.disabled = true;
        } else {
            if (roomGameMessage) roomGameMessage.textContent = 'Devine le nombre. Le premier qui trouve gagne !';
            if (roomStateMessage) roomStateMessage.textContent = `Partie en cours - ${room.difficulty}`;
            if (roomGuessInput) roomGuessInput.disabled = false;
        }
        if (roomAttemptsCount) roomAttemptsCount.textContent = room.limitAttempts === Infinity ? `Essais : ${room.attempts}` : `Essais restants : ${Math.max(room.limitAttempts - room.attempts, 0)}`;
    }

    function createRoom(host, difficulty) {
        const config = getDifficultyConfig(difficulty);
        const room = {
            code: generateRoomCode(),
            host,
            difficulty,
            round: 1,
            createdAt: Date.now(),
            secretNumber: Math.floor(Math.random() * config.maxValue) + 1,
            maxValue: config.maxValue,
            limitAttempts: config.limitAttempts,
            attempts: 0,
            status: 'active',
            winner: null,
        };
        saveOnlineRoom(room);
        return room;
    }

    function relaunchRoom(room, newDifficulty) {
        const config = getDifficultyConfig(newDifficulty);
        const nextRoom = {
            ...room,
            difficulty: newDifficulty,
            round: room.round + 1,
            secretNumber: Math.floor(Math.random() * config.maxValue) + 1,
            maxValue: config.maxValue,
            limitAttempts: config.limitAttempts,
            attempts: 0,
            status: 'active',
            winner: null,
        };
        saveOnlineRoom(nextRoom);
        return nextRoom;
    }

    function renderRoom(room) {
        updateRoomSummary(room);
        resetRoomInterface(room);
        setRoomState(room);
    }

    function joinRoom(playerName, room) {
        currentPlayer = playerName;
        if (roomPanel) roomPanel.classList.remove('hidden');
        renderRoom(room);
    }

    if (tabButtons.length > 0) {
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                setActiveTab(button.dataset.tab);
            });
        });

        const defaultTab = Array.from(tabButtons).find(button => button.dataset.tab === 'create') || tabButtons[0];
        if (defaultTab) setActiveTab(defaultTab.dataset.tab);
    }

    if (createGameForm) {
        createGameForm.addEventListener('submit', event => {
            event.preventDefault();
            const playerName = document.getElementById('create-player-name').value.trim();
            const difficulty = document.getElementById('create-difficulty').value;
            if (!playerName) {
                showRoomMessage(createGameMessage, 'Entrez un pseudo pour créer la partie.', 'error');
                return;
            }
            const room = createRoom(playerName, difficulty);
            currentPlayer = playerName;
            updateRoomSummary(room);
            showRoomMessage(createGameMessage, `Partie créée ! Code : ${room.code}`, 'success');
            setActiveTab('join');
            const joinCodeInput = document.getElementById('join-room-code');
            if (joinCodeInput) joinCodeInput.value = room.code;
            joinRoom(playerName, room);
        });
    }

    if (joinGameForm) {
        joinGameForm.addEventListener('submit', event => {
            event.preventDefault();
            const playerName = document.getElementById('join-player-name').value.trim();
            const joinCode = document.getElementById('join-room-code').value.trim();
            if (!playerName) {
                showRoomMessage(joinGameMessage, 'Entrez votre pseudo pour rejoindre la partie.', 'error');
                return;
            }
            if (!hasSiteAccess()) {
                showRoomMessage(joinGameMessage, 'Seuls les joueurs déjà présents sur le site peuvent rejoindre avec un code.', 'error');
                return;
            }
            if (!/^[0-9]{4}$/.test(joinCode)) {
                showRoomMessage(joinGameMessage, 'Le code doit contenir 4 chiffres.', 'error');
                return;
            }

            const room = getOnlineRoom();
            if (!room || room.code !== joinCode) {
                showRoomMessage(joinGameMessage, 'Aucune partie trouvée avec ce code. Vérifiez et réessayez.', 'error');
                return;
            }

            showRoomMessage(joinGameMessage, `Bienvenue ${playerName} ! Vous avez rejoint la partie ${room.code}.`, 'success');
            joinRoom(playerName, room);
        });
    }

    if (roomGuessForm) {
        roomGuessForm.addEventListener('submit', event => {
            event.preventDefault();
            const room = getOnlineRoom();
            if (!room) return;
            if (!currentPlayer) return;
            if (room.status === 'ended') {
                showRoomMessage(roomGameMessage, 'La partie est terminée. Le chef peut relancer une nouvelle partie.', 'info');
                return;
            }
            const guessValue = Number(roomGuessInput.value);
            if (!guessValue || guessValue < 1 || guessValue > room.maxValue) {
                showRoomMessage(roomGameMessage, `Choisis un nombre entre 1 et ${room.maxValue}.`, 'error');
                return;
            }

            room.attempts += 1;
            const guessStatus = guessValue < room.secretNumber ? 'low' : (guessValue > room.secretNumber ? 'high' : 'correct');
            if (guessStatus === 'correct') {
                room.status = 'ended';
                room.winner = currentPlayer;
                showRoomMessage(roomGameMessage, `Bravo ${currentPlayer} ! Tu as trouvé le juste prix.`, 'success');
            } else if (guessStatus === 'low') {
                showRoomMessage(roomGameMessage, 'Trop bas ! Essaie plus haut.', 'hint');
            } else {
                showRoomMessage(roomGameMessage, 'Trop haut ! Essaie plus bas.', 'hint');
            }

            if (room.limitAttempts !== Infinity && room.attempts >= room.limitAttempts && room.status !== 'ended') {
                room.status = 'ended';
                showRoomMessage(roomGameMessage, `Plus d'essais disponibles. Le chef peut relancer la partie.`, 'error');
            }

            saveOnlineRoom(room);
            renderRoom(room);
            if (roomGuessInput) roomGuessInput.value = '';
        });
    }

    if (roomResetButton) {
        roomResetButton.addEventListener('click', () => {
            const room = getOnlineRoom();
            if (!room || !currentPlayer || currentPlayer !== room.host) return;
            const newDifficulty = relaunchDifficulty ? relaunchDifficulty.value : room.difficulty;
            const nextRoom = relaunchRoom(room, newDifficulty);
            showRoomMessage(roomGameMessage, `Partie relancée en ${nextRoom.difficulty}.`, 'success');
            renderRoom(nextRoom);
        });
    }

    if (relaunchForm) {
        relaunchForm.addEventListener('submit', event => {
            event.preventDefault();
            const room = getOnlineRoom();
            if (!room || !currentPlayer || currentPlayer !== room.host) return;
            const newDifficulty = relaunchDifficulty.value;
            const nextRoom = relaunchRoom(room, newDifficulty);
            showRoomMessage(roomGameMessage, `Partie relancée en ${nextRoom.difficulty}.`, 'success');
            renderRoom(nextRoom);
        });
    }

    const storedRoom = getOnlineRoom();
    if (storedRoom && generatedRoomCode) {
        generatedRoomCode.textContent = storedRoom.code;
        roomInfo.textContent = `Dernière partie créée par ${storedRoom.host}. Difficulté : ${storedRoom.difficulty}.`;
    }

    const body = document.body;
    const toggleButton = document.getElementById('mode-toggle');
    const guessForm = document.getElementById('guess-form');
    const guessInput = document.getElementById('guess');
    const messageEl = document.getElementById('game-message');
    const attemptsCount = document.getElementById('attempts-count');
    const resetButton = document.getElementById('reset-button');

    const storedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    function applyTheme(theme) {
        if (theme === 'dark') {
            body.classList.add('dark');
            if (toggleButton) toggleButton.textContent = '☀️ Mode Clair';
        } else {
            body.classList.remove('dark');
            if (toggleButton) toggleButton.textContent = '🌙 Mode Sombre';
        }
    }

    applyTheme(storedTheme || (systemPrefersDark ? 'dark' : 'light'));

    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            const nextTheme = body.classList.contains('dark') ? 'light' : 'dark';
            applyTheme(nextTheme);
            localStorage.setItem('theme', nextTheme);
        });
    }

    // Initialiser le jeu seulement si les éléments existent sur la page
    if (guessForm && guessInput && messageEl && attemptsCount && resetButton) {
        const maxValue = Number(guessInput.max) || 100;
        const LIMIT_ATTEMPTS = (maxValue > 100) ? 10 : Infinity; // moyen/difficile -> 10 essais

        let secretNumber = 0;
        let attempts = 0;
        let remaining = (LIMIT_ATTEMPTS === Infinity) ? Infinity : LIMIT_ATTEMPTS;
        let isGameOver = false;
        const guessHistoryList = document.getElementById('guess-history-list');
        const guessHistoryEmpty = document.getElementById('guess-history-empty');
        const guesses = [];

        function getRandomNumber(max = 100) {
            return Math.floor(Math.random() * max) + 1;
        }

        function updateAttempts() {
            if (LIMIT_ATTEMPTS === Infinity) {
                attemptsCount.textContent = `Essais : ${attempts}`;
            } else {
                attemptsCount.textContent = `Essais restants : ${remaining}`;
            }
        }

        function setMessage(text, status = 'info') {
            messageEl.textContent = text;
            messageEl.dataset.status = status;
        }

        function renderGuessHistory() {
            if (!guessHistoryList || !guessHistoryEmpty) return;
            guessHistoryList.innerHTML = '';

            if (guesses.length === 0) {
                guessHistoryEmpty.style.display = 'block';
                return;
            }

            guessHistoryEmpty.style.display = 'none';

            guesses.forEach((guess) => {
                const item = document.createElement('li');
                item.className = `guess-history-item guess-history-item--${guess.status}`;
                item.textContent = guess.value;
                guessHistoryList.appendChild(item);
            });
        }

        function showSixSevenAlert() {
            const existingAlert = document.getElementById('six-seven-alert');
            if (existingAlert) {
                existingAlert.remove();
            }

            const alertBox = document.createElement('div');
            alertBox.id = 'six-seven-alert';
            alertBox.className = 'six-seven-alert';
            alertBox.innerHTML = '<span>SIX SEVENNN</span>';
            document.body.appendChild(alertBox);

            window.setTimeout(() => {
                alertBox.classList.add('six-seven-alert--hidden');
            }, 5000);

            window.setTimeout(() => {
                if (alertBox.parentNode) {
                    alertBox.parentNode.removeChild(alertBox);
                }
            }, 5500);
        }

        function clearErrorState() {
            guessForm.classList.remove('input-error');
            guessInput.classList.remove('input-error');
        }

        function endGameLost() {
            setMessage(`Partie terminée. Le juste prix était ${secretNumber}.`, 'error');
            isGameOver = true;
            guessInput.disabled = true;
        }

        function resetGame() {
            secretNumber = getRandomNumber(maxValue);
            if (secretNumber === 67) {
                showSixSevenAlert();
            }
            attempts = 0;
            remaining = (LIMIT_ATTEMPTS === Infinity) ? Infinity : LIMIT_ATTEMPTS;
            isGameOver = false;
            guesses.length = 0;
            guessInput.disabled = false;
            guessInput.value = '';
            clearErrorState();
            guessInput.focus();
            updateAttempts();
            renderGuessHistory();
            setMessage(`Prêt ? Devine un nombre entre 1 et ${maxValue}.`, 'info');
        }

        resetButton.addEventListener('click', resetGame);

        guessInput.addEventListener('input', () => {
            if (guessInput.value.trim().length > 0) {
                clearErrorState();
            }
        });

        guessForm.addEventListener('submit', event => {
            event.preventDefault();
            if (isGameOver) return;

            const guessValue = Number(guessInput.value);
            if (!guessValue || guessValue < 1 || guessValue > maxValue) {
                setMessage(`Choisis un nombre entre 1 et ${maxValue}.`, 'error');
                guessForm.classList.add('input-error');
                return;
            }

            attempts += 1;
            if (LIMIT_ATTEMPTS !== Infinity) {
                remaining -= 1;
            }

            const guessStatus = guessValue < secretNumber ? 'low' : (guessValue > secretNumber ? 'high' : 'correct');
            guesses.push({ value: guessValue, status: guessStatus });
            renderGuessHistory();
            updateAttempts();
            guessInput.value = '';

            if (guessStatus === 'low') {
                setMessage('Trop bas ! Essaie plus haut.', 'hint');
                guessForm.classList.add('input-error');
                guessInput.classList.add('input-error');
            } else if (guessStatus === 'high') {
                setMessage('Trop haut ! Essaie plus bas.', 'hint');
                guessForm.classList.add('input-error');
                guessInput.classList.add('input-error');
            } else {
                setMessage(`Bravo ! Le juste prix était ${secretNumber}.`, 'success');
                clearErrorState();
                isGameOver = true;
                guessInput.disabled = true;
                return;
            }

            if (LIMIT_ATTEMPTS !== Infinity && remaining <= 0) {
                endGameLost();
            }
        });

        resetGame();
    }
});
