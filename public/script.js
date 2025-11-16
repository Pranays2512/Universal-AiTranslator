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