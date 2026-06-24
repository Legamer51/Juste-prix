document.addEventListener('DOMContentLoaded', () => {
    // Bouton de retour
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            history.back();
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

        function endGameLost() {
            setMessage(`Partie terminée. Le juste prix était ${secretNumber}.`, 'error');
            isGameOver = true;
            guessInput.disabled = true;
        }

        function resetGame() {
            secretNumber = getRandomNumber(maxValue);
            attempts = 0;
            remaining = (LIMIT_ATTEMPTS === Infinity) ? Infinity : LIMIT_ATTEMPTS;
            isGameOver = false;
            guessInput.disabled = false;
            guessInput.value = '';
            guessInput.focus();
            updateAttempts();
            setMessage(`Prêt ? Devine un nombre entre 1 et ${maxValue}.`, 'info');
        }

        resetButton.addEventListener('click', resetGame);

        guessForm.addEventListener('submit', event => {
            event.preventDefault();
            if (isGameOver) return;

            const guessValue = Number(guessInput.value);
            if (!guessValue || guessValue < 1 || guessValue > maxValue) {
                setMessage(`Choisis un nombre entre 1 et ${maxValue}.`, 'error');
                return;
            }

            attempts += 1;
            if (LIMIT_ATTEMPTS !== Infinity) {
                remaining -= 1;
            }
            updateAttempts();

            if (guessValue < secretNumber) {
                setMessage('Trop bas ! Essaie plus haut.', 'hint');
            } else if (guessValue > secretNumber) {
                setMessage('Trop haut ! Essaie plus bas.', 'hint');
            } else {
                setMessage(`Bravo ! Le juste prix était ${secretNumber}.`, 'success');
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
