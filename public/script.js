let isAuthenticated = false;
let currentUser = null;
let socket = null;
const inputText = document.getElementById('inputText');
const wordCount = document.getElementById('wordCount');

// WebSocket connection flag
let useWebSocket = true;

document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupEventListeners();
    setupThemeToggle();
});

function setupThemeToggle() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Set initial theme - default to dark
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', initialTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
}

function setupEventListeners() {
    inputText.addEventListener('input', () => {
        const count = inputText.value.length;
        wordCount.textContent = `${count} / 5000`;
        wordCount.style.color = count > 4500 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)';
        
        // Emit typing event via WebSocket
        if (socket && socket.connected && isAuthenticated) {
            socket.emit('typing', { timestamp: Date.now() });
        }
    });

    inputText.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            translateText();
        }
    });

    const focusableElements = document.querySelectorAll('input, select, textarea, button');
    focusableElements.forEach(element => {
        element.addEventListener('focus', () => element.style.transform = 'scale(1.01)');
        element.addEventListener('blur', () => element.style.transform = 'scale(1)');
    });

    document.getElementById('authOverlay').addEventListener('click', function(e) {
        if (e.target === this) {
            closeWindow();
        }
    });
    
    document.getElementById('micBtn').addEventListener('click', toggleSpeechRecognition);
    
    document.getElementById('inputLang').addEventListener('change', function() {
        if (recognition && this.value !== 'auto') {
            recognition.lang = this.value;
        }
    });

    // Image upload functionality
    document.getElementById('imageBtn').addEventListener('click', () => {
        if (!isAuthenticated) {
            showWindow();
            return;
        }
        document.getElementById('imageInput').click();
    });

    document.getElementById('imageInput').addEventListener('change', handleImageUpload);
}

function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        const userData = getCurrentUser(); 
        if (userData) {
            isAuthenticated = true;
            currentUser = userData;
            showUserInfo();
            initializeWebSocket(token);
        } else {
            isAuthenticated = false;
            localStorage.removeItem('token'); 
            hideUserInfo();
        }
    } else {
        isAuthenticated = false;
        hideUserInfo();
    }
}

function getCurrentUser() {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        try {
            return JSON.parse(userData);
        } catch (e) {
            console.error('Error parsing user data:', e);
            return null;
        }
    }
    return currentUser;
}

function showUserInfo() {
    const userInfo = document.getElementById('userInfo');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    
    if (currentUser) {
        userAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
        userName.textContent = currentUser.name;
        userInfo.classList.add('active');
    }
}

function hideUserInfo() {
    document.getElementById('userInfo').classList.remove('active');
}

function showWindow() {
    const overlay = document.getElementById('authOverlay');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeWindow() {
    const overlay = document.getElementById('authOverlay');
    overlay.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function switchWindow(tab) {
    const signinTab = document.getElementById('signinTab');
    const signupTab = document.getElementById('signupTab');
    const nameGroup = document.getElementById('nameGroup');
    const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
    
    const isSignin = tab === 'signin';
    
    signinTab.classList.toggle('active', isSignin);
    signupTab.classList.toggle('active', !isSignin);
    
    document.getElementById('authTitle').textContent = isSignin ? 'Welcome Back' : 'Create Account';
    document.getElementById('authSubtitle').textContent = isSignin ? 'Sign in to access the translator' : 'Sign up to start translating';
    document.getElementById('authSubmitBtn').textContent = isSignin ? 'Sign In' : 'Sign Up';
    
    nameGroup.style.display = isSignin ? 'none' : 'block';
    confirmPasswordGroup.style.display = isSignin ? 'none' : 'block';
    document.getElementById('forgotLink').style.display = isSignin ? 'block' : 'none';
    
    document.getElementById('nameInput').required = !isSignin;
    document.getElementById('confirmPasswordInput').required = !isSignin;
}

async function signUpAndSignIn(event) {
    event.preventDefault();

    const isSignUp = document.getElementById('signupTab').classList.contains('active');
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    const name = document.getElementById('nameInput').value.trim();
    const confirmPassword = document.getElementById('confirmPasswordInput').value.trim();
    const submitBtn = document.getElementById('authSubmitBtn');

    if (!email || !password || (isSignUp && (!name || !confirmPassword))) {
        alert('Please fill all required fields');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }

    if (isSignUp && password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    submitBtn.textContent = isSignUp ? 'Creating Account...' : 'Signing In...';
    submitBtn.disabled = true;

    try {
        const body = isSignUp
            ? { name, email, password, confirmPassword }
            : { email, password };

        const endpoint = isSignUp ? '/signup' : '/sign-in';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (response.ok) {
            const token = data.token;
            localStorage.setItem('token', token); 
            localStorage.setItem('currentUser', JSON.stringify(data.user)); 
            currentUser = data.user;
            isAuthenticated = true;
            showUserInfo();
            closeWindow();
            clearAuthForm();
            
            // Initialize WebSocket after authentication
            initializeWebSocket(token);
        } else {
            alert(data.message || 'Authentication failed');
        }
    } catch (err) {
        console.error(err);
        alert('Error connecting to server');
    }

    submitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
    submitBtn.disabled = false;
}

function clearAuthForm() {
    document.getElementById('authForm').reset();
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        isAuthenticated = false;
        currentUser = null;
        localStorage.removeItem('token'); 
        localStorage.removeItem('currentUser'); 
        hideUserInfo();
        clearText();
        
        // Disconnect WebSocket
        if (socket) {
            socket.disconnect();
            socket = null;
        }
    }
}

function showForgotPassword() {
    alert('Password reset functionality would be implemented in a real app.');
}

// WebSocket initialization
function initializeWebSocket(token) {
    if (!token) return;
    
    // Load Socket.IO client
    const script = document.createElement('script');
    script.src = '/socket.io/socket.io.js';
    script.onload = () => {
        socket = io({
            auth: { token },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });
        
        // Authenticate
        socket.emit('authenticate', token);
        
        // Authentication response
        socket.on('authenticated', (data) => {
            if (data.success) {
                console.log('WebSocket authenticated');
            } else {
                console.error('WebSocket authentication failed:', data.message);
                useWebSocket = false;
            }
        });
        
        // Handle translation queued
        socket.on('translation:queued', (data) => {
            console.log('Translation queued:', data);
            const output = document.getElementById('outputText');
            output.value = 'Translation in progress...';
        });
        
        // Handle translation completed
        socket.on('translation:completed', (data) => {
            console.log('Translation completed:', data);
            const output = document.getElementById('outputText');
            output.value = data.translatedText;
            
            const btn = document.getElementById('translateBtn');
            btn.textContent = 'Translate';
            btn.disabled = false;
            btn.style.opacity = '1';
            output.classList.remove('loading');
            
            output.style.transform = 'scale(1.01)';
            setTimeout(() => { output.style.transform = 'scale(1)'; }, 300);
            
            // Update current translation for save functionality
            const inputText = document.getElementById('inputText').value;
            const sourceLang = document.getElementById('inputLang').value;
            const targetLang = document.getElementById('outputLang').value;
            updateCurrentTranslation(inputText, data.translatedText, sourceLang, targetLang);
        });
        
        // Handle translation error
        socket.on('translation:error', (data) => {
            console.error('Translation error:', data.message);
            alert(data.message);
            
            const output = document.getElementById('outputText');
            output.value = '';
            
            const btn = document.getElementById('translateBtn');
            btn.textContent = 'Translate';
            btn.disabled = false;
            btn.style.opacity = '1';
            output.classList.remove('loading');
        });
        
        // Connection events
        socket.on('connect', () => {
            console.log('WebSocket connected');
        });
        
        socket.on('disconnect', () => {
            console.log('WebSocket disconnected');
        });
        
        socket.on('reconnect', (attemptNumber) => {
            console.log('WebSocket reconnected after', attemptNumber, 'attempts');
        });
        
        socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
            useWebSocket = false;
        });
    };
    
    document.head.appendChild(script);
}

// Handle image upload and OCR
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please upload a valid image file');
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
    }

    const imageBtn = document.getElementById('imageBtn');
    const outputText = document.getElementById('outputText');
    
    imageBtn.classList.add('processing');
    imageBtn.title = 'Processing image...';
    
    // Show processing message
    outputText.value = 'Extracting text from image...';
    outputText.classList.add('loading');

    try {
        // Convert image to base64
        const base64Image = await fileToBase64(file);

        // Extract text and translate in one step
        const token = localStorage.getItem('token');
        const targetLanguage = document.getElementById('outputLang')?.value || 'en';

        outputText.value = 'Translating extracted text...';

        const response = await fetch('/ocr/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                imageData: base64Image,
                targetLang: targetLanguage
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Display extracted text in input
            inputText.value = data.extractedText;
            inputText.dispatchEvent(new Event('input'));

            // Display translation in output
            outputText.value = data.translatedText;
            outputText.classList.remove('loading');

            // Visual feedback
            outputText.style.transform = 'scale(1.01)';
            setTimeout(() => { outputText.style.transform = 'scale(1)'; }, 300);

            // Show confidence if low
            if (data.ocrConfidence < 70) {
                console.warn(`Low OCR confidence: ${data.ocrConfidence}%`);
                alert(`Text extracted with ${data.ocrConfidence}% confidence. The result may not be accurate. Please verify the extracted text.`);
            } else {
                console.log(`OCR Confidence: ${data.ocrConfidence}%`);
            }
        } else {
            outputText.value = '';
            outputText.classList.remove('loading');
            alert(data.message || 'Failed to process image');
        }
    } catch (err) {
        console.error('Image processing error:', err);
        outputText.value = '';
        outputText.classList.remove('loading');
        alert('Error processing image. Please try again.');
    } finally {
        imageBtn.classList.remove('processing');
        imageBtn.title = 'Upload image with text';
        // Reset file input
        event.target.value = '';
    }
}

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function translateText() {
    if (!isAuthenticated) {
        showWindow();
        return;
    }

    const input = inputText.value.trim();
    const output = document.getElementById('outputText');
    const btn = document.getElementById('translateBtn');
    const targetLanguage = document.getElementById('outputLang')?.value || 'en';

    if (!input) {
        output.value = '';
        return;
    }

    btn.textContent = 'Translating...';
    btn.disabled = true;
    btn.style.opacity = '0.6';
    output.classList.add('loading');
    output.value = '';

    // Use WebSocket if available and connected
    if (useWebSocket && socket && socket.connected) {
        socket.emit('translate', { text: input, targetLang: targetLanguage });
        return;
    }

    // Fallback to REST API
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showWindow();
            return;
        }

        const response = await fetch('/translate', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ text: input, targetLang: targetLanguage }) 
        });

        const data = await response.json();

        if (response.ok) {
            output.value = data.translatedText;
            
            // Update current translation for save functionality
            const sourceLang = document.getElementById('inputLang').value;
            updateCurrentTranslation(input, data.translatedText, sourceLang, targetLanguage);
        } else {
            output.value = '';
            if (response.status === 401) {
                logout();
                showWindow();
            } else {
                alert(data.message || 'Translation failed');
            }
        }
    } catch (err) {
        output.value = '';
        alert('Error connecting to server');
        console.error(err);
    }

    btn.textContent = 'Translate';
    btn.disabled = false;
    btn.style.opacity = '1';
    output.classList.remove('loading');

    output.style.transform = 'scale(1.01)';
    setTimeout(() => { output.style.transform = 'scale(1)'; }, 300);
}

function clearText() {
    inputText.value = '';
    document.getElementById('outputText').value = '';
    wordCount.textContent = '0 / 5000';
    wordCount.style.color = 'rgba(255, 255, 255, 0.4)';
    
    // Hide save button when clearing
    currentTranslationData = null;
    const saveBtn = document.getElementById('saveTranslationBtn');
    if (saveBtn) {
        saveBtn.style.display = 'none';
    }
}

function copyTranslation() {
    if (!isAuthenticated) {
        showWindow();
        return;
    }
    
    const output = document.getElementById('outputText');
    const copyBtn = document.getElementById('copyBtn');
    
    if (output.value) {
        navigator.clipboard.writeText(output.value).then(() => {
            copyBtn.textContent = 'Copied';
            copyBtn.style.background = 'rgba(255, 255, 255, 0.15)';
            copyBtn.style.color = '#ffffff';
            
            setTimeout(() => {
                copyBtn.textContent = 'Copy';
                copyBtn.style.background = 'rgba(255, 255, 255, 0.06)';
                copyBtn.style.color = 'rgba(255, 255, 255, 0.8)';
            }, 2000);
        });
    }
}

// Speech recognition (keeping original functionality)
let recognition = null;
let isListening = false;

function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
            isListening = true;
            const micBtn = document.getElementById('micBtn');
            micBtn.classList.add('listening');
            micBtn.title = 'Stop listening';
        };
        
        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
                
            inputText.value = transcript;
            inputText.dispatchEvent(new Event('input'));
        };
        
        recognition.onend = () => {
            isListening = false;
            const micBtn = document.getElementById('micBtn');
            micBtn.classList.remove('listening');
            micBtn.title = 'Speech to text';
        };
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            isListening = false;
            const micBtn = document.getElementById('micBtn');
            micBtn.classList.remove('listening');
            micBtn.title = 'Speech to text';
            
            if (event.error === 'not-allowed') {
                alert('Microphone permission denied. Please allow microphone access to use speech recognition.');
            }
        };
        
        return true;
    } else {
        console.log('Speech recognition not supported');
        return false;
    }
}

function toggleSpeechRecognition() {
    if (!isAuthenticated) {
        showWindow();
        return;
    }
    
    if (!recognition && !initSpeechRecognition()) {
        alert('Speech recognition is not supported in your browser. Try Chrome, Edge, or Safari.');
        return;
    }
    
    if (isListening) {
        recognition.stop();
    } else {
        const inputLang = document.getElementById('inputLang').value;
        if (inputLang !== 'auto') {
            recognition.lang = inputLang;
        }
        
        try {
            recognition.start();
        } catch (error) {
            console.error('Speech recognition error', error);
        }
    }
}
// ==================== Translation History & Saved Translations ====================

let currentHistoryPage = 1;
let currentSavedPage = 1;
let currentTranslationData = null;

// Update translation data when translation completes
function updateCurrentTranslation(sourceText, translatedText, sourceLang, targetLang) {
    currentTranslationData = {
        sourceText,
        translatedText,
        sourceLang,
        targetLang
    };
    
    // Show save button if there's a translation
    const saveBtn = document.getElementById('saveTranslationBtn');
    if (translatedText && translatedText.trim()) {
        saveBtn.style.display = 'flex';
        checkIfTranslationSaved();
    } else {
        saveBtn.style.display = 'none';
    }
}

// Check if current translation is already saved
async function checkIfTranslationSaved() {
    if (!currentTranslationData || !isAuthenticated) return;
    
    const token = localStorage.getItem('token');
    const { sourceText, sourceLang, targetLang } = currentTranslationData;
    
    try {
        const response = await fetch(
            `/api/saved/check?sourceText=${encodeURIComponent(sourceText)}&sourceLang=${encodeURIComponent(sourceLang)}&targetLang=${encodeURIComponent(targetLang)}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        
        const data = await response.json();
        const saveBtn = document.getElementById('saveTranslationBtn');
        
        if (data.success && data.isSaved) {
            saveBtn.classList.add('saved');
        } else {
            saveBtn.classList.remove('saved');
        }
    } catch (error) {
        console.error('Error checking saved status:', error);
    }
}

// Toggle save/unsave translation
async function toggleSaveTranslation() {
    if (!currentTranslationData || !isAuthenticated) return;
    
    const token = localStorage.getItem('token');
    const saveBtn = document.getElementById('saveTranslationBtn');
    const isSaved = saveBtn.classList.contains('saved');
    
    try {
        if (isSaved) {
            // Find and remove from saved
            const checkResponse = await fetch(
                `/api/saved/check?sourceText=${encodeURIComponent(currentTranslationData.sourceText)}&sourceLang=${encodeURIComponent(currentTranslationData.sourceLang)}&targetLang=${encodeURIComponent(currentTranslationData.targetLang)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            const checkData = await checkResponse.json();
            
            if (checkData.success && checkData.data) {
                const response = await fetch(`/api/saved/${checkData.data.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    saveBtn.classList.remove('saved');
                    showNotification('Removed from saved translations');
                }
            }
        } else {
            // Save translation
            const response = await fetch('/api/saved', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(currentTranslationData)
            });
            
            if (response.ok) {
                saveBtn.classList.add('saved');
                showNotification('Translation saved!');
            }
        }
    } catch (error) {
        console.error('Error toggling save:', error);
        showNotification('Failed to save translation', 'error');
    }
}

// Show history modal
async function showHistory() {
    if (!isAuthenticated) {
        showWindow();
        return;
    }
    
    const modal = document.getElementById('historyModal');
    modal.style.display = 'flex';
    currentHistoryPage = 1;
    await loadHistory();
}

// Close history modal
function closeHistory() {
    document.getElementById('historyModal').style.display = 'none';
}

// Load translation history
async function loadHistory(page = 1) {
    const token = localStorage.getItem('token');
    const listEl = document.getElementById('historyList');
    
    listEl.innerHTML = '<div class="loading">Loading history...</div>';
    
    try {
        const response = await fetch(`/api/history?page=${page}&limit=10`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentHistoryPage = page;
            displayHistory(result.data, result.pagination);
        } else {
            listEl.innerHTML = '<div class="empty-state">Failed to load history</div>';
        }
    } catch (error) {
        console.error('Error loading history:', error);
        listEl.innerHTML = '<div class="empty-state">Failed to load history</div>';
    }
}

// Display history items
function displayHistory(items, pagination) {
    const listEl = document.getElementById('historyList');
    
    if (!items || items.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <h3>No translation history yet</h3>
                <p>Your translation history will appear here</p>
            </div>
        `;
        document.getElementById('historyPagination').innerHTML = '';
        return;
    }
    
    listEl.innerHTML = items.map(item => `
        <div class="history-item" data-item-id="${item.id}">
            <div class="history-item-header">
                <div class="history-langs">${item.sourceLang.toUpperCase()} → ${item.targetLang.toUpperCase()}</div>
                <div class="history-date">${formatDate(item.createdAt)}</div>
            </div>
            <div class="history-text-row">
                <div class="history-text-col">
                    <div class="history-label">Original</div>
                    <div class="history-text">${escapeHtml(item.sourceText)}</div>
                </div>
                <div class="history-text-col">
                    <div class="history-label">Translation</div>
                    <div class="history-text">${escapeHtml(item.translatedText)}</div>
                </div>
            </div>
            <div class="history-actions">
                <button class="history-btn history-use-btn" 
                    data-text="${escapeHtml(item.sourceText)}" 
                    data-source-lang="${item.sourceLang}" 
                    data-target-lang="${item.targetLang}">Use</button>
                <button class="history-btn history-btn-delete history-delete-btn" data-id="${item.id}">Delete</button>
            </div>
        </div>
    `).join('');
    
    // Add event delegation for buttons
    listEl.querySelectorAll('.history-use-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const text = sanitizeText(this.getAttribute('data-text'));
            const sourceLang = sanitizeText(this.getAttribute('data-source-lang'));
            const targetLang = sanitizeText(this.getAttribute('data-target-lang'));
            if (text && sourceLang && targetLang) {
                useHistoryItem(text, sourceLang, targetLang);
            }
        });
    });
    
    listEl.querySelectorAll('.history-delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'), 10);
            if (!isNaN(id) && id > 0) {
                deleteHistoryItem(id);
            }
        });
    });
    
    displayPagination('historyPagination', pagination, loadHistory);
}

// Show saved translations modal
async function showSaved() {
    if (!isAuthenticated) {
        showWindow();
        return;
    }
    
    const modal = document.getElementById('savedModal');
    modal.style.display = 'flex';
    currentSavedPage = 1;
    await loadSaved();
}

// Close saved modal
function closeSaved() {
    document.getElementById('savedModal').style.display = 'none';
}

// Load saved translations
async function loadSaved(page = 1) {
    const token = localStorage.getItem('token');
    const listEl = document.getElementById('savedList');
    
    listEl.innerHTML = '<div class="loading">Loading saved translations...</div>';
    
    try {
        const response = await fetch(`/api/saved?page=${page}&limit=10`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentSavedPage = page;
            displaySaved(result.data, result.pagination);
        } else {
            listEl.innerHTML = '<div class="empty-state">Failed to load saved translations</div>';
        }
    } catch (error) {
        console.error('Error loading saved:', error);
        listEl.innerHTML = '<div class="empty-state">Failed to load saved translations</div>';
    }
}

// Display saved items
function displaySaved(items, pagination) {
    const listEl = document.getElementById('savedList');
    
    if (!items || items.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <h3>No saved translations yet</h3>
                <p>Save your favorite translations to access them quickly</p>
            </div>
        `;
        document.getElementById('savedPagination').innerHTML = '';
        return;
    }
    
    listEl.innerHTML = items.map(item => `
        <div class="history-item" data-item-id="${item.id}">
            <div class="history-item-header">
                <div class="history-langs">⭐ ${item.sourceLang.toUpperCase()} → ${item.targetLang.toUpperCase()}</div>
                <div class="history-date">${formatDate(item.updatedAt)}</div>
            </div>
            <div class="history-text-row">
                <div class="history-text-col">
                    <div class="history-label">Original</div>
                    <div class="history-text">${escapeHtml(item.sourceText)}</div>
                </div>
                <div class="history-text-col">
                    <div class="history-label">Translation</div>
                    <div class="history-text">${escapeHtml(item.translatedText)}</div>
                </div>
            </div>
            ${item.note ? `<div class="saved-note">Note: ${escapeHtml(item.note)}</div>` : ''}
            <div class="history-actions">
                <button class="history-btn saved-use-btn" 
                    data-text="${escapeHtml(item.sourceText)}" 
                    data-source-lang="${item.sourceLang}" 
                    data-target-lang="${item.targetLang}">Use</button>
                <button class="history-btn history-btn-delete saved-remove-btn" data-id="${item.id}">Remove</button>
            </div>
        </div>
    `).join('');
    
    // Add event delegation for buttons
    listEl.querySelectorAll('.saved-use-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const text = sanitizeText(this.getAttribute('data-text'));
            const sourceLang = sanitizeText(this.getAttribute('data-source-lang'));
            const targetLang = sanitizeText(this.getAttribute('data-target-lang'));
            if (text && sourceLang && targetLang) {
                useSavedItem(text, sourceLang, targetLang);
            }
        });
    });
    
    listEl.querySelectorAll('.saved-remove-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'), 10);
            if (!isNaN(id) && id > 0) {
                removeSavedItem(id);
            }
        });
    });
    
    displayPagination('savedPagination', pagination, loadSaved);
}

// Display pagination controls
function displayPagination(elementId, pagination, loadFunction) {
    const paginationEl = document.getElementById(elementId);
    
    if (pagination.totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }
    
    paginationEl.innerHTML = `
        <button class="pagination-prev" ${pagination.page <= 1 ? 'disabled' : ''}>
            Previous
        </button>
        <span>Page ${pagination.page} of ${pagination.totalPages}</span>
        <button class="pagination-next" ${pagination.page >= pagination.totalPages ? 'disabled' : ''}>
            Next
        </button>
    `;
    
    // Add event listeners to pagination buttons
    const prevBtn = paginationEl.querySelector('.pagination-prev');
    const nextBtn = paginationEl.querySelector('.pagination-next');
    
    if (prevBtn && !prevBtn.disabled) {
        prevBtn.addEventListener('click', () => loadFunction(pagination.page - 1));
    }
    
    if (nextBtn && !nextBtn.disabled) {
        nextBtn.addEventListener('click', () => loadFunction(pagination.page + 1));
    }
}

// Delete history item
async function deleteHistoryItem(id) {
    if (!confirm('Delete this translation from history?')) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`/api/history/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showNotification('Translation deleted from history');
            await loadHistory(currentHistoryPage);
        } else {
            showNotification('Failed to delete translation', 'error');
        }
    } catch (error) {
        console.error('Error deleting history:', error);
        showNotification('Failed to delete translation', 'error');
    }
}

// Clear all history
async function clearHistory() {
    if (!confirm('Are you sure you want to clear all translation history? This cannot be undone.')) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('/api/history', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showNotification('Translation history cleared');
            await loadHistory(1);
        } else {
            showNotification('Failed to clear history', 'error');
        }
    } catch (error) {
        console.error('Error clearing history:', error);
        showNotification('Failed to clear history', 'error');
    }
}

// Remove saved item
async function removeSavedItem(id) {
    if (!confirm('Remove this translation from saved?')) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`/api/saved/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showNotification('Translation removed from saved');
            await loadSaved(currentSavedPage);
            
            // Update save button if this was the current translation
            if (currentTranslationData) {
                checkIfTranslationSaved();
            }
        } else {
            showNotification('Failed to remove translation', 'error');
        }
    } catch (error) {
        console.error('Error removing saved:', error);
        showNotification('Failed to remove translation', 'error');
    }
}

// Use history item
function useHistoryItem(text, sourceLang, targetLang) {
    document.getElementById('inputText').value = text;
    document.getElementById('inputLang').value = sourceLang;
    document.getElementById('outputLang').value = targetLang;
    closeHistory();
    translateText();
}

// Use saved item
function useSavedItem(text, sourceLang, targetLang) {
    document.getElementById('inputText').value = text;
    document.getElementById('inputLang').value = sourceLang;
    document.getElementById('outputLang').value = targetLang;
    closeSaved();
    translateText();
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function sanitizeText(text) {
    // Remove any potential script tags and dangerous characters
    if (!text) return '';
    return text.replace(/<[^>]*>/g, '').trim();
}

function showNotification(message, type = 'success') {
    // Simple notification - could be enhanced with a toast library
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'error' ? 'rgba(255, 59, 48, 0.9)' : 'rgba(52, 199, 89, 0.9)'};
        color: white;
        border-radius: 12px;
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
