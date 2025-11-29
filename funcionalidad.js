/**
 * Lógica del Juego de Memoria Emoji
 * Maneja modos de juego (Solo, 1vs1), niveles, puntajes y conexión a Firebase.
 */

// Importaciones de Firebase para base de datos y autenticación
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- CONFIGURACIÓN DE FIREBASE ---
// Si descargas este código, necesitas poner tu propia configuración aquí para que funcione online.
// Si no, el juego detectará el error y funcionará en modo "Local".
let firebaseConfig;
try {
    // Intenta leer la config del entorno Canvas (no funcionará en local sin esto)
    firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
} catch (e) {
    // Placeholder vacío si falla
    firebaseConfig = {}; 
}

// Inicialización de la app (envuelta en try-catch para evitar crash si no hay config)
let app, auth, db;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'emoji-memory';

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (error) {
    console.log("Firebase no configurado o error al iniciar. Modo Offline activado.");
}

// --- VARIABLES GLOBALES DE ESTADO ---
let currentUser = null;
let globalHighScores = [];
let isOfflineMode = false;

// --- GESTIÓN DE CONEXIÓN ---

/**
 * Actualiza el indicador visual de conexión en el menú principal.
 * @param {boolean} isOffline - Si es true, muestra modo local.
 */
function updateConnectionStatus(isOffline) {
    isOfflineMode = isOffline;
    const statusEl = document.getElementById('connection-status');
    if (!statusEl) return;

    if (isOffline) {
        statusEl.textContent = "Modo Offline (Récords Locales)";
        statusEl.className = "text-yellow-200 text-xs mt-2 font-bold font-mono bg-yellow-900/40 px-2 py-1 rounded inline-block";
    } else {
        statusEl.textContent = "Conectado al servidor global";
        statusEl.className = "text-green-300 text-xs mt-2 font-bold font-mono bg-green-900/40 px-2 py-1 rounded inline-block";
    }
}

/**
 * Intenta iniciar sesión en Firebase.
 */
const initAuth = async () => {
    try {
        if (!auth) throw new Error("No Auth Instance"); // Si falló la config
        if (!navigator.onLine) throw new Error("Browser offline");
        
        // Usa token del entorno si existe, sino anónimo
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
        updateConnectionStatus(false);
    } catch (error) {
        console.log("Auth falló o sin conexión, activando modo offline:", error);
        updateConnectionStatus(true);
    }
};

// Listeners del navegador para cambios de red
window.addEventListener('online', () => { if (!currentUser) initAuth(); });
window.addEventListener('offline', () => updateConnectionStatus(true));

// Listener de estado de Firebase Auth
if (auth) {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user) {
            updateConnectionStatus(false);
            setupRealtimeScores();
        }
    });
} else {
    updateConnectionStatus(true); // Default a offline si no hay auth
}

/**
 * Escucha cambios en la colección de récords en Firestore.
 */
function setupRealtimeScores() {
    if (!db) return;
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'scores');
    
    onSnapshot(colRef, (snapshot) => {
        const scores = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if(data.time && data.name) scores.push(data);
        });
        // Ordenar por tiempo ascendente (menor es mejor)
        scores.sort((a, b) => a.time - b.time);
        globalHighScores = scores.slice(0, 5);
        
        // Actualizar UI si el modal está abierto
        if (!isOfflineMode && !document.getElementById('records-modal').classList.contains('hidden')) {
            renderRecordsList(document.getElementById('records-list-view'), globalHighScores, "Récords Globales");
        }
    }, (error) => {
        console.error("Error fetching scores:", error);
        updateConnectionStatus(true);
    });
}

// --- PERSISTENCIA LOCAL (LocalStorage) ---

function getLocalScores() {
    const stored = localStorage.getItem('emojiMemoryLocalScores');
    return stored ? JSON.parse(stored) : [];
}

function saveLocalScore(name, time) {
    const scores = getLocalScores();
    scores.push({ name, time, date: new Date().toLocaleDateString() });
    scores.sort((a, b) => a.time - b.time);
    const top5 = scores.slice(0, 5);
    localStorage.setItem('emojiMemoryLocalScores', JSON.stringify(top5));
    return top5;
}

// Iniciar autenticación al cargar el script
initAuth();

// --- CONFIGURACIÓN DEL JUEGO ---

// Definición de los 10 niveles (Filas, Columnas, Pares)
const levelConfig = [
    { level: 1,  cols: 3, rows: 2, pairs: 3 },
    { level: 2,  cols: 3, rows: 4, pairs: 6 },
    { level: 3,  cols: 4, rows: 4, pairs: 8 },
    { level: 4,  cols: 4, rows: 5, pairs: 10 },
    { level: 5,  cols: 4, rows: 6, pairs: 12 },
    { level: 6,  cols: 5, rows: 6, pairs: 15 },
    { level: 7,  cols: 5, rows: 6, pairs: 15 },
    { level: 8,  cols: 6, rows: 6, pairs: 18 },
    { level: 9,  cols: 6, rows: 7, pairs: 21 },
    { level: 10, cols: 6, rows: 8, pairs: 24 }
];

// Banco de Emojis para usar en las cartas
const emojiPool = [
    '❤️', '✨', '✅', '😂', '⭐', '🌼',
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
    '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆',
    '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋',
    '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎',
    '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟',
    '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧',
    '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄'
];

// --- VARIABLES DE JUEGO ---
let currentLevelIndex = 0;
let cards = []; // Array de cartas actual
let hasFlippedCard = false;
let lockBoard = false; // Bloqueo para evitar clicks rápidos
let firstCard, secondCard;
let matches = 0;
let totalSeconds = 0;
let timerInterval;
let gameActive = false;
let gameMode = 'solo'; // 'solo' o 'versus'

// Variables Versus (1 vs 1)
let p1Name = "Jugador 1";
let p2Name = "Jugador 2";
let currentTurn = 1; // 1 o 2
let p1Score = 0;
let p2Score = 0;
let p1Pairs = 0;
let p2Pairs = 0;
let p1TotalWins = 0;
let p2TotalWins = 0;
let p1TotalScore = 0;
let p2TotalScore = 0;
let consecutiveMatches = 0; // Para racha de puntos

// Referencias a elementos del DOM
const body = document.body;
const dom = {
    mainMenu: document.getElementById('main-menu'),
    gameContainer: document.getElementById('game-container'),
    recordsModal: document.getElementById('records-modal'),
    exitModal: document.getElementById('exit-modal'),
    levelModal: document.getElementById('level-modal'),
    victoryModal: document.getElementById('victory-modal'),
    gameBoard: document.getElementById('game-board'),
    levelDisplay: document.getElementById('current-level'),
    leftStatContainer: document.getElementById('left-stat-label').parentElement,
    rightStatContainer: document.getElementById('right-stat-label').parentElement,
    leftStatLabel: document.getElementById('left-stat-label'),
    leftStatValue: document.getElementById('left-stat-value'),
    rightStatLabel: document.getElementById('right-stat-label'),
    rightStatValue: document.getElementById('right-stat-value'),
    modalLevelNum: document.getElementById('modal-level-num'),
    modeModal: document.getElementById('mode-modal'),
    namesModal: document.getElementById('names-modal'),
    turnModal: document.getElementById('turn-modal'),
    turnPlayerName: document.getElementById('turn-player-name'),
    p1Input: document.getElementById('p1-input'),
    p2Input: document.getElementById('p2-input'),
    finalStatLabel: document.getElementById('final-stat-label'),
    finalStatValue: document.getElementById('final-stat-value'),
    victoryTitle: document.getElementById('victory-title'),
    victorySubtitle: document.getElementById('victory-subtitle'),
    recordForm: document.getElementById('record-form'),
    noRecordMsg: document.getElementById('no-record-msg'),
    playerNameInput: document.getElementById('player-name'),
    recordsListView: document.getElementById('records-list-view'),
    recordsTitle: document.getElementById('records-title'),
    recordsSubtitle: document.getElementById('records-subtitle'),
    levelSummaryVs: document.getElementById('level-summary-vs'),
    levelWinnerName: document.getElementById('level-winner-name'),
    btnViewRecords: document.getElementById('btn-view-records')
};

// --- FUNCIÓN MAESTRA DE REINICIO ---
/**
 * Restablece TODAS las variables del juego a su estado inicial.
 * Se llama al volver al menú para asegurar que la próxima partida empiece de 0.
 */
function resetAllGameData() {
    // Variables generales
    currentLevelIndex = 0;
    totalSeconds = 0;
    matches = 0;
    gameActive = false;
    hasFlippedCard = false;
    lockBoard = false;
    firstCard = null;
    secondCard = null;
    
    // Variables Versus
    p1Score = 0; p2Score = 0;
    p1Pairs = 0; p2Pairs = 0;
    p1TotalWins = 0; p2TotalWins = 0;
    p1TotalScore = 0; p2TotalScore = 0;
    consecutiveMatches = 0;
    currentTurn = 1;
    
    // Limpieza visual
    dom.levelDisplay.textContent = '1';
    dom.leftStatValue.textContent = '00:00'; 
    dom.rightStatValue.textContent = '--';
    dom.gameBoard.innerHTML = ''; 
}

// --- API PÚBLICA DEL JUEGO (window.gameApp) ---
// Funciones accesibles desde el HTML (onclick)
window.gameApp = {
    
    // Abre el modal para elegir Solo o Versus
    openModeSelection: () => {
        dom.modeModal.classList.remove('hidden');
        body.classList.add('modal-active');
    },
    
    closeModeSelection: () => {
        dom.modeModal.classList.add('hidden');
        body.classList.remove('modal-active');
    },

    // Inicia modo Solitario
    startGameSolo: () => {
        gameMode = 'solo';
        window.gameApp.closeModeSelection();
        dom.mainMenu.classList.add('hidden');
        dom.gameContainer.classList.remove('hidden');
        
        // Configura el HUD para Solo
        dom.leftStatLabel.textContent = "TIEMPO";
        dom.rightStatLabel.textContent = "PARES";
        dom.leftStatLabel.className = "text-[10px] uppercase tracking-wider opacity-90 font-bold truncate w-full text-center px-1";
        dom.rightStatLabel.className = "text-[10px] uppercase tracking-wider opacity-90 font-bold truncate w-full text-center px-1";
        
        // Reinicio de seguridad
        currentLevelIndex = 0;
        totalSeconds = 0;
        initLevel();
    },

    // Abre modal de nombres para Versus
    openNamesModal: () => {
        dom.modeModal.classList.add('hidden');
        dom.namesModal.classList.remove('hidden');
    },

    // Inicia modo Versus
    startVersusGame: () => {
        gameMode = 'versus';
        p1Name = dom.p1Input.value.trim() || "JUGADOR 1";
        p2Name = dom.p2Input.value.trim() || "JUGADOR 2";
        
        dom.namesModal.classList.add('hidden');
        dom.mainMenu.classList.add('hidden');
        dom.gameContainer.classList.remove('hidden');
        body.classList.remove('modal-active');

        // Reinicio completo de estado
        currentLevelIndex = 0;
        p1TotalWins = 0; p2TotalWins = 0;
        p1TotalScore = 0; p2TotalScore = 0;
        resetLevelVariables();
        
        showTurnModal(); // Mostrar quién empieza
    },

    // Vuelve al menú principal y resetea todo
    showMenu: () => {
        clearInterval(timerInterval);
        timerInterval = null;
        
        // Ocultar todos los elementos de juego
        dom.gameContainer.classList.add('hidden');
        dom.levelModal.classList.add('hidden');
        dom.victoryModal.classList.add('hidden');
        dom.exitModal.classList.add('hidden');
        dom.recordsModal.classList.add('hidden');
        dom.modeModal.classList.add('hidden');
        dom.namesModal.classList.add('hidden');
        dom.turnModal.classList.add('hidden');
        
        dom.mainMenu.classList.remove('hidden');
        body.classList.remove('modal-active');
        document.querySelectorAll('.confetti').forEach(c => c.remove());

        // LLAMADA CRÍTICA: Reiniciar variables al salir
        resetAllGameData();
    },

    // Gestión de Modal de Récords
    openRecordsModal: () => {
        const scores = isOfflineMode ? getLocalScores() : globalHighScores;
        const title = isOfflineMode ? "Récords Locales" : "Récords Globales";
        const subtitle = isOfflineMode ? "En este dispositivo" : "Top 5 Mundial";
        renderRecordsList(dom.recordsListView, scores, title, subtitle);
        dom.recordsModal.classList.remove('hidden');
        body.classList.add('modal-active');
    },

    closeRecordsModal: () => {
        dom.recordsModal.classList.add('hidden');
        // Solo quitar blur si no hay victoria detrás
        if (dom.victoryModal.classList.contains('hidden')) {
            body.classList.remove('modal-active');
        }
    },

    // Gestión de Salida
    confirmExit: () => {
        dom.exitModal.classList.remove('hidden');
        body.classList.add('modal-active');
    },

    closeExitModal: () => {
        dom.exitModal.classList.add('hidden');
        body.classList.remove('modal-active');
    },

    exitToMenu: () => {
        window.gameApp.closeExitModal();
        window.gameApp.showMenu();
    },

    restartLevel: () => initLevel(),

    // Ir al siguiente nivel
    nextLevel: () => {
        dom.levelModal.classList.add('hidden');
        body.classList.remove('modal-active');
        currentLevelIndex++;
        resetLevelVariables();
        
        if (gameMode === 'versus') {
            showTurnModal();
        } else {
            initLevel();
        }
    },

    // Guardar puntaje (Solo modo Solitario)
    saveScore: async () => {
        const name = dom.playerNameInput.value.trim() || 'ANÓNIMO';
        
        // Intenta guardar online, fallback a local
        if (isOfflineMode) {
            saveLocalScore(name.toUpperCase(), totalSeconds);
            finishSave();
        } else if (currentUser) {
            const newScore = { 
                name: name.toUpperCase(), 
                time: totalSeconds, 
                date: new Date().toLocaleDateString(),
                timestamp: Date.now() 
            };
            try {
                const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'scores');
                await addDoc(colRef, newScore);
                finishSave();
            } catch (e) {
                alert("Error de conexión. Guardando localmente.");
                updateConnectionStatus(true);
                saveLocalScore(name.toUpperCase(), totalSeconds);
                finishSave();
            }
        }
    }
};

// Cierra modales tras guardar
function finishSave() {
    dom.recordForm.classList.add('hidden');
    dom.victoryModal.classList.add('hidden');
    window.gameApp.openRecordsModal();
}

// Resetea variables temporales del nivel (sin borrar totales)
function resetLevelVariables() {
    if (gameMode === 'solo') {
        updateTimeDisplay();
    } else {
        p1Score = 0;
        p2Score = 0;
        p1Pairs = 0;
        p2Pairs = 0;
        consecutiveMatches = 0;
        currentTurn = 1; 
        updateVersusHUD();
    }
}

// --- INICIO DE NIVEL ---
function initLevel() {
    gameActive = true;
    lockBoard = false;
    hasFlippedCard = false;
    firstCard = null;
    secondCard = null;
    matches = 0;
    
    // Obtener configuración del nivel actual
    const config = levelConfig[currentLevelIndex];
    dom.levelDisplay.textContent = config.level;
    
    // Selección y mezcla de emojis
    const shuffledPool = [...emojiPool].sort(() => 0.5 - Math.random());
    const selectedEmojis = shuffledPool.slice(0, config.pairs);
    cards = [...selectedEmojis, ...selectedEmojis];
    cards.sort(() => 0.5 - Math.random());

    renderBoard(config);
    
    // Actualizar UI
    if (gameMode === 'versus') {
        updateVersusHUD();
    } else {
        updatePairsInfo(levelConfig[currentLevelIndex].pairs);
    }

    // Iniciar timer si corresponde
    clearInterval(timerInterval);
    if (gameMode === 'solo') startTimer();
}

// --- RENDERIZADO DEL TABLERO ---
function renderBoard(config) {
    dom.gameBoard.innerHTML = '';
    dom.gameBoard.style.gridTemplateColumns = `repeat(${config.cols}, 1fr)`;
    
    // --- Lógica de Tamaño de Fuente Adaptable ---
    // Ajusta el tamaño del emoji según la densidad de cartas
    let fontSize = '4rem'; 
    
    if (config.cols === 4) fontSize = '2.8rem';
    if (config.cols === 5) fontSize = '2rem';
    if (config.cols >= 6)  fontSize = '1.5rem';
    
    if (config.rows >= 4) fontSize = '2.5rem'; // Ajuste crítico para nivel 2
    if (config.rows >= 5) fontSize = '2rem';
    if (config.rows >= 7) fontSize = '1.4rem';

    if (config.cols >= 5 && config.rows >= 6) fontSize = '1.2rem'; // Casos muy densos

    // Crear elementos del DOM para cada carta
    cards.forEach((emoji, index) => {
        const card = document.createElement('div');
        card.classList.add('memory-card', 'fade-in');
        card.dataset.framework = emoji;
        card.dataset.index = index;

        const frontFace = document.createElement('div');
        frontFace.classList.add('front-face');
        const emojiSpan = document.createElement('span');
        emojiSpan.classList.add('emoji-content');
        emojiSpan.textContent = emoji;
        emojiSpan.style.fontSize = fontSize;
        frontFace.appendChild(emojiSpan);

        const backFace = document.createElement('div');
        backFace.classList.add('back-face');
        
        card.appendChild(frontFace);
        card.appendChild(backFace);
        
        card.addEventListener('click', flipCard);
        dom.gameBoard.appendChild(card);
    });
}

function updatePairsInfo(totalPairs) {
    dom.rightStatValue.textContent = `${matches}/${totalPairs}`;
}

// Actualiza la interfaz Versus (nombres, colores, puntos)
function updateVersusHUD() {
    dom.leftStatLabel.textContent = p1Name.toUpperCase();
    dom.rightStatLabel.textContent = p2Name.toUpperCase();
    dom.leftStatLabel.className = "text-[10px] uppercase tracking-wider font-bold truncate w-full text-center px-1 text-red-500 drop-shadow-sm";
    dom.rightStatLabel.className = "text-[10px] uppercase tracking-wider font-bold truncate w-full text-center px-1 text-green-500 drop-shadow-sm";
    dom.leftStatValue.textContent = p1Score;
    dom.rightStatValue.textContent = p2Score;
    
    // Resaltar fondo del jugador activo
    if (currentTurn === 1) {
        dom.leftStatContainer.classList.add('bg-white/30', 'shadow-inner');
        dom.rightStatContainer.classList.remove('bg-white/30', 'shadow-inner');
        dom.leftStatValue.classList.add('text-red-100');
        dom.rightStatValue.classList.remove('text-green-100');
    } else {
        dom.leftStatContainer.classList.remove('bg-white/30', 'shadow-inner');
        dom.rightStatContainer.classList.add('bg-white/30', 'shadow-inner');
        dom.leftStatValue.classList.remove('text-red-100');
        dom.rightStatValue.classList.add('text-green-100');
    }
}

// --- MECÁNICA DE JUEGO ---

function flipCard() {
    if (lockBoard) return;
    if (this === firstCard) return;
    if (!gameActive) return;

    this.classList.add('flip');

    if (!hasFlippedCard) {
        hasFlippedCard = true;
        firstCard = this;
        return;
    }

    secondCard = this;
    checkForMatch();
}

function checkForMatch() {
    let isMatch = firstCard.dataset.framework === secondCard.dataset.framework;
    isMatch ? processMatch() : processMiss();
}

function processMatch() {
    lockBoard = true;
    
    // Sistema de Puntos y Combos (Versus)
    if (gameMode === 'versus') {
        consecutiveMatches++;
        let points = 10;
        if (consecutiveMatches >= 5) points *= 3; // Multiplicador x3
        
        if (currentTurn === 1) {
            p1Score += points;
            p1Pairs++;
        } else {
            p2Score += points;
            p2Pairs++;
        }
        updateVersusHUD();
    }

    setTimeout(() => {
        firstCard.querySelector('.front-face').classList.add('match-animation');
        secondCard.querySelector('.front-face').classList.add('match-animation');
        
        // Clonar nodos para eliminar listeners
        const newFirst = firstCard.cloneNode(true);
        const newSecond = secondCard.cloneNode(true);
        firstCard.parentNode.replaceChild(newFirst, firstCard);
        secondCard.parentNode.replaceChild(newSecond, secondCard);
        firstCard = newFirst; 
        secondCard = newSecond;

        resetBoardState();
        matches++;
        
        if (gameMode === 'solo') updatePairsInfo(levelConfig[currentLevelIndex].pairs);
        
        if (matches === levelConfig[currentLevelIndex].pairs) {
            handleLevelComplete();
        }
    }, 300);
}

function processMiss() {
    lockBoard = true;
    if (gameMode === 'versus') {
        consecutiveMatches = 0; // Romper combo
    }

    setTimeout(() => {
        firstCard.classList.remove('flip');
        secondCard.classList.remove('flip');
        resetBoardState();
        
        // Cambio de turno al fallar
        if (gameMode === 'versus') {
            switchTurn();
        }
    }, 800);
}

function resetBoardState() {
    [hasFlippedCard, lockBoard] = [false, false];
    [firstCard, secondCard] = [null, null];
}

function switchTurn() {
    currentTurn = currentTurn === 1 ? 2 : 1;
    updateVersusHUD();
    showTurnModal();
}

function showTurnModal() {
    const name = currentTurn === 1 ? p1Name : p2Name;
    dom.turnPlayerName.textContent = name;
    dom.turnPlayerName.className = `text-4xl font-bold mb-4 break-words leading-tight ${currentTurn === 1 ? 'text-red-500' : 'text-green-500'}`;
    dom.turnModal.classList.remove('hidden');
    setTimeout(() => {
        dom.turnModal.classList.add('hidden');
        if (!gameActive) initLevel();
    }, 1500);
}

// --- FINALIZACIÓN DE NIVEL Y JUEGO ---

function handleLevelComplete() {
    clearInterval(timerInterval);
    timerInterval = null;
    gameActive = false;

    // Determinar ganador del nivel en Versus
    if (gameMode === 'versus') {
        p1TotalScore += p1Score;
        p2TotalScore += p2Score;

        let winnerName = "Empate";
        let winnerColor = "text-gray-600";

        // Regla: Mayor puntaje gana el nivel
        if (p1Score > p2Score) {
            winnerName = p1Name;
            winnerColor = "text-red-600";
            p1TotalWins++;
        } else if (p2Score > p1Score) {
            winnerName = p2Name;
            winnerColor = "text-green-600";
            p2TotalWins++;
        } else {
            // Empate en puntos -> Mayor cantidad de pares
            if (p1Pairs > p2Pairs) { 
                winnerName = p1Name; 
                winnerColor = "text-red-600";
                p1TotalWins++; 
            } else if (p2Pairs > p1Pairs) { 
                winnerName = p2Name;
                winnerColor = "text-green-600";
                p2TotalWins++; 
            }
        }
       
       dom.levelWinnerName.textContent = winnerName;
       dom.levelWinnerName.className = `text-xl font-bold ${winnerColor}`;
       dom.levelSummaryVs.classList.remove('hidden');
    } else {
        dom.levelSummaryVs.classList.add('hidden');
    }

    if (currentLevelIndex + 1 < levelConfig.length) {
        setTimeout(() => {
            dom.modalLevelNum.textContent = levelConfig[currentLevelIndex].level;
            dom.levelModal.classList.remove('hidden');
            body.classList.add('modal-active');
            createConfetti(20);
        }, 500);
    } else {
        setTimeout(handleGameVictory, 500);
    }
}

function startTimer() {
    timerInterval = setInterval(() => {
        totalSeconds++;
        updateTimeDisplay();
    }, 1000);
}

function updateTimeDisplay() {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    dom.leftStatValue.textContent = `${mins}:${secs}`;
}

function handleGameVictory() {
    createConfetti(100);
    
    if (gameMode === 'solo') {
        // Victoria Solo
        dom.victoryTitle.textContent = "¡GANASTE!";
        dom.victorySubtitle.textContent = "Has completado los 10 niveles.";
        dom.finalStatLabel.textContent = "TIEMPO TOTAL";
        dom.finalStatValue.textContent = dom.leftStatValue.textContent;
        dom.finalStatValue.className = "text-4xl font-bold text-indigo-600 font-mono break-words";
        dom.btnViewRecords.classList.remove('hidden');
        
        // Verificar Récord
        const scoresToCheck = isOfflineMode ? getLocalScores() : globalHighScores;
        const isHighScore = scoresToCheck.length < 5 || totalSeconds < scoresToCheck[scoresToCheck.length - 1]?.time;
        if (isHighScore || scoresToCheck.length < 5) {
            dom.recordForm.classList.remove('hidden');
            dom.noRecordMsg.classList.add('hidden');
            dom.playerNameInput.value = '';
        } else {
            dom.recordForm.classList.add('hidden');
            dom.noRecordMsg.classList.remove('hidden');
        }
    } else {
        // Victoria Versus
        dom.recordForm.classList.add('hidden');
        dom.noRecordMsg.classList.add('hidden');
        dom.btnViewRecords.classList.add('hidden');

        let gameWinner = "";
        let winnerColor = "text-indigo-600";
        
        // Determinar ganador global
        if (p1TotalWins > p2TotalWins) {
            gameWinner = p1Name;
            winnerColor = "text-red-600";
        } else if (p2TotalWins > p1TotalWins) {
            gameWinner = p2Name;
            winnerColor = "text-green-600";
        } else {
            // Empate en niveles -> Puntos totales
            if (p1TotalScore > p2TotalScore) {
                gameWinner = p1Name;
                winnerColor = "text-red-600";
            } else if (p2TotalScore > p1TotalScore) {
                gameWinner = p2Name;
                winnerColor = "text-green-600";
            } else {
                gameWinner = "EMPATE TOTAL";
                winnerColor = "text-gray-600";
            }
        }

        dom.victoryTitle.textContent = "¡VICTORIA!";
        dom.victorySubtitle.textContent = "Juego terminado";
        dom.finalStatLabel.textContent = "GANADOR DEL JUEGO";
        dom.finalStatValue.textContent = gameWinner;
        dom.finalStatValue.className = `text-4xl font-bold ${winnerColor} break-words leading-tight`;
    }

    dom.victoryModal.classList.remove('hidden');
    body.classList.add('modal-active');
}

function createConfetti(amount) {
    const colors = ['#f43f5e', '#10b981', '#3b82f6', '#f59e0b'];
    for (let i = 0; i < amount; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDuration = Math.random() * 2 + 2 + 's';
        confetti.style.opacity = Math.random();
        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 4000);
    }
}

// Función auxiliar para renderizar listas de puntajes (reutilizada en modales)
function renderRecordsList(container, scores, title, subtitle) {
    container.innerHTML = '';
    
    if (title) dom.recordsTitle.textContent = title;
    if (subtitle) dom.recordsSubtitle.textContent = subtitle;

    if (scores.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p class="text-gray-400">Sin récords registrados.</p>
                <p class="text-sm text-indigo-400 mt-1 font-bold">¡Sé el primero!</p>
            </div>`;
        return;
    }

    scores.forEach((score, index) => {
        const mins = Math.floor(score.time / 60).toString().padStart(2, '0');
        const secs = (score.time % 60).toString().padStart(2, '0');
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        const bgColors = [
            'bg-yellow-50 border-yellow-200', 
            'bg-gray-50 border-gray-200', 
            'bg-orange-50 border-orange-200',
            'bg-white border-gray-100',
            'bg-white border-gray-100'
        ];
        
        const div = document.createElement('div');
        div.className = `flex justify-between items-center p-4 rounded-xl border ${bgColors[index] || bgColors[3]} shadow-sm`;
        div.innerHTML = `
            <div class="flex items-center gap-4">
                <span class="text-3xl filter drop-shadow-sm">${medals[index]}</span>
                <div class="flex flex-col text-left">
                    <span class="font-bold text-gray-800 text-lg leading-none">${score.name}</span>
                    <span class="text-[10px] text-gray-400 uppercase tracking-wide mt-1">${score.date}</span>
                </div>
            </div>
            <span class="font-mono font-bold text-xl text-indigo-600 bg-white/80 px-2 py-1 rounded shadow-sm">${mins}:${secs}</span>
        `;
        container.appendChild(div);
    });
}