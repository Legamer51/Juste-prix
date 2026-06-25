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
