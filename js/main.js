// Main JavaScript file for ClothesShare platform with Firebase integration
import { FirebaseAPI, auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Global variables
let currentUser = null;
let cart = [];
let wishlist = [];
let products = [];
let userItems = [];
let ngoRequests = [];
let authLoading = true; // Track if authentication is still loading

// Initialize application
document.addEventListener('DOMContentLoaded', function () {
    // Always initialize navigation and page-specific functionality first
    initNavigation();
    initGlobalEventListeners();
    initializePageSpecificFunctionality();
    initSidebarToggle();

    // Initialize sample data on first load
    FirebaseAPI.initializeSampleData();

    // Listen for auth state changes
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in
            const userData = await FirebaseAPI.getUser(user.uid);
            if (userData.success) {
                currentUser = userData.data;
                await loadUserData();
                updateUIForAuthenticatedUser();

                // Redirect to dashboard if on auth page
                if (getCurrentPage() === 'auth') {
                    redirectToDashboard();
                }
            }
        } else {
            // User is signed out
            currentUser = null;
            cart = [];
            updateUIForUnauthenticatedUser();
        }
        
        // Auth state is now ready
        authLoading = false;
    });
});

// Utility Functions
function getCurrentPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop().split('.')[0];
    return page || 'index';
}

function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        background: ${type === 'success' ? 'var(--neon-cyan)' : type === 'error' ? 'var(--neon-pink)' : 'var(--neon-orange)'};
        color: var(--bg-primary);
        padding: var(--spacing-md) var(--spacing-lg);
        border-radius: var(--radius-md);
        box-shadow: var(--glass-shadow);
        z-index: 2000;
        font-weight: 500;
        transform: translateX(400px);
        transition: transform 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function formatPrice(price) {
    return `₹${parseInt(price).toLocaleString()}`;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Firebase Data Loading Functions
async function loadUserData() {
    if (!currentUser) return;

    try {
        // Load user's cart
        const cartResult = await FirebaseAPI.getCart(currentUser.id);
        if (cartResult.success) {
            cart = cartResult.data;
            updateCartUI();
        }

        // Load user's items if donor
        if (currentUser.role === 'donor') {
            const itemsResult = await FirebaseAPI.getItems({ donorId: currentUser.id });
            if (itemsResult.success) {
                userItems = itemsResult.data;
            }
        }

        // Load NGO requests if NGO
        if (currentUser.role === 'ngo') {
            const ngoResult = await FirebaseAPI.getNGORequests({ userId: currentUser.id });
            if (ngoResult.success && ngoResult.data.length > 0) {
                const ngoRequest = ngoResult.data[0];
                currentUser.ngoStatus = ngoRequest.status;
                currentUser.ngoId = ngoRequest.id;
            }
        }

        // Load all products for customers and admins
        if (currentUser.role === 'customer' || currentUser.role === 'admin') {
            const productsResult = await FirebaseAPI.getItems({ status: 'approved' });
            if (productsResult.success) {
                products = productsResult.data;
            }
        }

        // Load admin data
        if (currentUser.role === 'admin') {
            const allItemsResult = await FirebaseAPI.getItems();
            if (allItemsResult.success) {
                userItems = allItemsResult.data;
            }

            const allNGOsResult = await FirebaseAPI.getNGORequests();
            if (allNGOsResult.success) {
                ngoRequests = allNGOsResult.data;
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Authentication Functions  
function checkAuth(requiredRole) {
    // If authentication is still loading, don't redirect
    if (authLoading) {
        return false;
    }
    
    if (!currentUser) {
        // Only redirect if we're not already on the auth page to prevent loops
        if (getCurrentPage() !== 'auth') {
            window.location.href = 'auth.html';
        }
        return false;
    }

    if (requiredRole && currentUser.role !== requiredRole) {
        showNotification('Access denied. Redirecting to appropriate dashboard.', 'error');
        redirectToDashboard();
        return false;
    }

    return true;
}

// Make checkAuth available globally for HTML pages
window.checkAuth = checkAuth;

// Make dashboard initialization functions available globally for HTML pages
window.initDonorDashboard = function() {
    if (authLoading) {
        // Wait for auth to be ready, then try again
        setTimeout(() => window.initDonorDashboard(), 100);
        return;
    }
    if (checkAuth('donor')) {
        _initDonorDashboard();
    }
};
window.initCustomerDashboard = function() {
    if (authLoading) {
        // Wait for auth to be ready, then try again
        setTimeout(() => window.initCustomerDashboard(), 100);
        return;
    }
    if (checkAuth('customer')) {
        _initCustomerDashboard();
    }
};
window.initNGODashboard = function() {
    if (authLoading) {
        // Wait for auth to be ready, then try again
        setTimeout(() => window.initNGODashboard(), 100);
        return;
    }
    if (checkAuth('ngo')) {
        _initNGODashboard();
    }
};

function redirectToDashboard() {
    if (!currentUser) {
        window.location.href = 'auth.html';
        return;
    }

    switch (currentUser.role) {
        case 'donor':
            window.location.href = 'donor.html';
            break;
        case 'customer':
            window.location.href = 'customer.html';
            break;
        case 'ngo':
            window.location.href = 'ngo.html';
            break;
        case 'admin':
            window.location.href = 'admin.html';
            break;
        default:
            window.location.href = 'index.html';
    }
}

async function logout() {
    try {
        await FirebaseAPI.signOutUser();
        currentUser = null;
        cart = [];
        window.location.href = 'index.html';
        showNotification('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out', 'error');
    }
}

// UI Update Functions
function updateUIForAuthenticatedUser() {
    const userNameElements = document.querySelectorAll('#user-name');
    userNameElements.forEach(element => {
        if (currentUser) {
            element.textContent = currentUser.name || currentUser.role;
        }
    });
    
    // Update auth button
    const authButton = document.getElementById('auth-button');
    if (authButton) {
        authButton.innerHTML = '<i class="fas fa-sign-out-alt"></i> Log Out';
        authButton.href = '#';
        authButton.onclick = (e) => {
            e.preventDefault();
            logout();
        };
    }
}

function updateUIForUnauthenticatedUser() {
    // Clear any user-specific UI elements
    const userNameElements = document.querySelectorAll('#user-name');
    userNameElements.forEach(element => {
        element.textContent = '';
    });
    
    // Update auth button
    const authButton = document.getElementById('auth-button');
    if (authButton) {
        authButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        authButton.href = 'auth.html';
        authButton.onclick = null;
    }
}

function updateCartUI() {
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        cartCountElement.textContent = cart.length;
    }

    const cartItemsElement = document.getElementById('cart-items');
    if (cartItemsElement) {
        if (cart.length === 0) {
            cartItemsElement.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Your cart is empty</p>
                </div>
            `;
        } else {
            cartItemsElement.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-image">
                        <img src="${item.images[0]}" alt="${item.name}">
                    </div>
                    <div class="cart-item-details">
                        <h4 class="cart-item-title">${item.name}</h4>
                        <span class="cart-item-price">${formatPrice(item.price)}</span>
                        <div class="cart-item-actions">
                            <button class="btn btn-secondary btn-sm" onclick="buyNow('${item.id}')">
                                <i class="fas fa-bolt"></i> Buy Now
                            </button>
                            <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        updateCartTotals();
    }
}

function updateCartTotals() {
    if (cart.length === 0) {
        const cartFooter = document.getElementById('cart-footer');
        if (cartFooter) cartFooter.style.display = 'none';
        return;
    }

    const itemsTotal = cart.reduce((total, item) => total + item.price, 0);
    const platformFee = Math.round(itemsTotal * 0.1); // 10% platform fee
    const deliveryFee = 50;
    const finalTotal = itemsTotal + platformFee + deliveryFee;

    const itemsTotalElement = document.getElementById('items-total');
    const platformFeeElement = document.getElementById('platform-fee');
    const deliveryFeeElement = document.getElementById('delivery-fee');
    const finalTotalElement = document.getElementById('final-total');
    const cartFooter = document.getElementById('cart-footer');

    if (itemsTotalElement) itemsTotalElement.textContent = formatPrice(itemsTotal);
    if (platformFeeElement) platformFeeElement.textContent = formatPrice(platformFee);
    if (deliveryFeeElement) deliveryFeeElement.textContent = formatPrice(deliveryFee);
    if (finalTotalElement) finalTotalElement.textContent = formatPrice(finalTotal);
    if (cartFooter) cartFooter.style.display = 'block';
}

// Navigation Functions
function initNavigation() {
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (navToggle && navMenu) {
        // Toggle mobile menu
        navToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
        
        // Close mobile menu when clicking on nav links
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            });
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            }
        });
        
        // Close mobile menu on window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 1024) {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            }
        });
    }
}

function initGlobalEventListeners() {
    // Smooth scrolling for anchor links
    document.addEventListener('click', (e) => {
        if (e.target.matches('a[href^="#"]')) {
            e.preventDefault();
            const target = document.querySelector(e.target.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });
}

// Page Initialization
function initializePageSpecificFunctionality() {
    const currentPage = getCurrentPage();
    switch (currentPage) {
        case 'index':
            initLandingPage();
            break;
        case 'auth':
            initAuthPage();
            break;
        case 'donor':
            if (checkAuth('donor')) {
                _initDonorDashboard();
            }
            break;
        case 'customer':
            if (checkAuth('customer')) {
                _initCustomerDashboard();
            }
            break;
        case 'ngo':
            if (checkAuth('ngo')) {
                _initNGODashboard();
            }
            break;
        case 'admin':
            initAdminPortal();
            break;
    }
}

// Landing Page Functions
function initLandingPage() {
    // Add intersection observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.8s ease-out forwards';
            }
        });
    }, observerOptions);

    // Observe sections for animation
    document.querySelectorAll('.feature-card, .stat-item').forEach(el => {
        observer.observe(el);
    });

    // Handle role-based redirects from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const role = urlParams.get('role');
    if (role) {
        sessionStorage.setItem('selectedRole', role);
    }
}

// Auth Page Functions
function initAuthPage() {
    console.log('Initializing auth page...');

    const loginToggle = document.getElementById('login-toggle');
    const signupToggle = document.getElementById('signup-toggle');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const roleSelect = document.getElementById('role');

    // Check for pre-selected role
    const selectedRole = sessionStorage.getItem('selectedRole');
    if (selectedRole && roleSelect) {
        roleSelect.value = selectedRole;
        // Switch to signup form
        toggleAuthForm('signup');
    }

    // Toggle between login and signup
    function toggleAuthForm(type) {
        console.log('Toggling auth form to:', type);
        if (type === 'login') {
            if (loginToggle) loginToggle.classList.add('active');
            if (signupToggle) signupToggle.classList.remove('active');
            if (loginForm) loginForm.classList.remove('hidden');
            if (signupForm) signupForm.classList.add('hidden');
            if (authTitle) authTitle.textContent = 'Welcome Back';
            if (authSubtitle) authSubtitle.textContent = 'Sign in to your account';
        } else {
            if (signupToggle) signupToggle.classList.add('active');
            if (loginToggle) loginToggle.classList.remove('active');
            if (signupForm) signupForm.classList.remove('hidden');
            if (loginForm) loginForm.classList.add('hidden');
            if (authTitle) authTitle.textContent = 'Create Account';
            if (authSubtitle) authSubtitle.textContent = 'Join our sustainable fashion community';
        }
    }

    // Make toggleAuthForm globally accessible
    window.toggleAuthForm = toggleAuthForm;

    if (loginToggle && signupToggle) {
        loginToggle.addEventListener('click', () => toggleAuthForm('login'));
        signupToggle.addEventListener('click', () => toggleAuthForm('signup'));
        console.log('Added click listeners to toggle buttons');
    }

    // Handle login form
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('Added submit listener to login form');
    }

    // Handle signup form
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
        console.log('Added submit listener to signup form');
    }
    
    // Handle Google authentication buttons
    const googleLoginBtn = document.getElementById('google-login-btn');
    const googleSignupBtn = document.getElementById('google-signup-btn');
    
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', handleGoogleLogin);
        console.log('Added click listener to Google login button');
    }
    
    if (googleSignupBtn) {
        googleSignupBtn.addEventListener('click', handleGoogleSignup);
        console.log('Added click listener to Google signup button');
    }

    // Enable form inputs (sometimes they get disabled)
    const inputs = document.querySelectorAll('#login-form input, #signup-form input, #signup-form select');
    inputs.forEach(input => {
        input.disabled = false;
        input.readOnly = false;
    });

    console.log('Auth page initialization complete');
}

async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    // Basic validation
    if (!email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    try {
        const result = await FirebaseAPI.signInUser(email, password);
        if (result.success) {
            showNotification('Login successful!', 'success');
            // Don't manually redirect - let onAuthStateChanged handle it
        } else {
            showNotification(result.error.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed', 'error');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const role = formData.get('role');
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    // Validation
    if (!role || !name || !email || !phone || !password || !confirmPassword) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        const userData = {
            name: name,
            phone: phone,
            role: role
        };

        const result = await FirebaseAPI.signUpUser(email, password, userData);
        if (result.success) {
            sessionStorage.removeItem('selectedRole');
            showNotification('Account created successfully!', 'success');
            // Don't manually redirect - let onAuthStateChanged handle it
        } else {
            showNotification(result.error.message || 'Signup failed', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showNotification('Signup failed', 'error');
    }
}

// Google Authentication Functions
async function handleGoogleLogin() {
    try {
        const result = await FirebaseAPI.signInWithGoogle();
        if (result.success) {
            showNotification('Google login successful!', 'success');
            // Don't manually redirect - let onAuthStateChanged handle it
        } else {
            showNotification(result.error?.message || 'Google login failed', 'error');
        }
    } catch (error) {
        console.error('Google login error:', error);
        showNotification('Google login failed', 'error');
    }
}

async function handleGoogleSignup() {
    try {
        const result = await FirebaseAPI.signInWithGoogle();
        if (result.success) {
            if (result.isNewUser) {
                // Show role selection for new Google users
                showRoleSelectionModal(result.user);
            } else {
                showNotification('Welcome back!', 'success');
                // Don't manually redirect - let onAuthStateChanged handle it
            }
        } else {
            showNotification(result.error?.message || 'Google signup failed', 'error');
        }
    } catch (error) {
        console.error('Google signup error:', error);
        showNotification('Google signup failed', 'error');
    }
}

// Role selection modal for Google users
function showRoleSelectionModal(user) {
    const modalHtml = `
        <div class="modal" id="role-selection-modal" style="display: flex;">
            <div class="modal-content">
                <div class="modal-body">
                    <h3>Welcome to ClothesShare!</h3>
                    <p>Please select your primary role to continue:</p>
                    <form id="google-role-form">
                        <div class="form-group">
                            <label for="google-role">I want to</label>
                            <select id="google-role" name="role" required>
                                <option value="">Select your role</option>
                                <option value="customer">Buy Clothes</option>
                                <option value="donor">Donate Clothes</option>
                                <option value="ngo">Partner as NGO</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary btn-full">
                            Continue
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = document.getElementById('role-selection-modal');
    const form = document.getElementById('google-role-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const role = formData.get('role');
        
        if (!role) {
            showNotification('Please select a role', 'error');
            return;
        }
        
        try {
            const updateResult = await FirebaseAPI.updateUser(user.id, { role });
            if (updateResult.success) {
                // Update current user data
                user.role = role;
                currentUser = user;
                
                modal.remove();
                showNotification('Role selected successfully!', 'success');
                // Don't manually redirect - let onAuthStateChanged handle it
            } else {
                showNotification('Failed to update role', 'error');
            }
        } catch (error) {
            console.error('Role update error:', error);
            showNotification('Failed to update role', 'error');
        }
    });
}

// Donor Dashboard Functions
function _initDonorDashboard() {
    initSidebarNavigation();
    initFileUpload();
    initClothesUploadForm();
    loadDonorItems();
    updateDonorAnalytics();

    // Update original price suggestion
    const originalPriceInput = document.getElementById('original-price');
    const suggestedPriceSpan = document.getElementById('suggested-price');

    if (originalPriceInput && suggestedPriceSpan) {
        originalPriceInput.addEventListener('input', (e) => {
            const originalPrice = parseFloat(e.target.value) || 0;
            const suggestedPrice = Math.round(originalPrice * 0.25);
            suggestedPriceSpan.textContent = suggestedPrice;
        });
    }
}

function initSidebarNavigation() {
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const sections = document.querySelectorAll('.dashboard-section');

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = link.getAttribute('data-section');

            // Update active link
            sidebarLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Show target section
            sections.forEach(section => {
                section.classList.remove('active');
            });
            const target = document.getElementById(`${targetSection}-section`);
            if (target) {
                target.classList.add('active');
            }
        });
    });
}

function initFileUpload() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const previewContainer = document.getElementById('preview-container');

    if (!uploadArea || !fileInput || !previewContainer) return;

    let selectedFiles = [];

    // Click to browse
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--neon-teal)';
        uploadArea.style.background = 'rgba(0, 212, 255, 0.05)';
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--glass-border)';
        uploadArea.style.background = 'var(--bg-tertiary)';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--glass-border)';
        uploadArea.style.background = 'var(--bg-tertiary)';

        const files = Array.from(e.dataTransfer.files);
        handleFileSelection(files);
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleFileSelection(files);
    });

    function handleFileSelection(files) {
        files.forEach(file => {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                showNotification(`File ${file.name} is too large (max 10MB)`, 'error');
                return;
            }

            if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
                showNotification(`File ${file.name} is not supported`, 'error');
                return;
            }

            selectedFiles.push(file);
            createPreview(file);
        });
    }

    function createPreview(file) {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';

        const reader = new FileReader();
        reader.onload = (e) => {
            if (file.type.startsWith('image/')) {
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="Preview">
                    <button class="preview-remove" onclick="removePreview(this, '${file.name}')">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            } else {
                previewItem.innerHTML = `
                    <video src="${e.target.result}" controls></video>
                    <button class="preview-remove" onclick="removePreview(this, '${file.name}')">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            }
        };
        reader.readAsDataURL(file);

        previewContainer.appendChild(previewItem);
    }

    // Global function for removing previews
    window.removePreview = function (button, fileName) {
        const previewItem = button.parentElement;
        previewItem.remove();
        selectedFiles = selectedFiles.filter(file => file.name !== fileName);
    };
}

async function initClothesUploadForm() {
    const uploadForm = document.getElementById('clothes-upload-form');
    if (!uploadForm) return;

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        // Validation
        const requiredFields = ['itemName', 'itemType', 'size', 'gender', 'condition', 'originalPrice'];
        for (let field of requiredFields) {
            if (!formData.get(field)) {
                showNotification(`Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`, 'error');
                return;
            }
        }

        try {
            // Create item object
            const item = {
                id: generateId(),
                name: formData.get('itemName'),
                type: formData.get('itemType'),
                size: formData.get('size'),
                gender: formData.get('gender'),
                condition: formData.get('condition'),
                originalPrice: parseFloat(formData.get('originalPrice')),
                price: Math.round(parseFloat(formData.get('originalPrice')) * 0.25),
                description: formData.get('description') || '',
                freeForNGO: formData.get('freeNgo') === 'on',
                donor: currentUser.name,
                donorId: currentUser.id,
                status: 'pending',
                images: ['https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400'], // Placeholder
                createdAt: Date.now()
            };

            // Save to Firebase
            const result = await FirebaseAPI.createItem(item);
            if (result.success) {
                // Reset form
                uploadForm.reset();
                document.getElementById('preview-container').innerHTML = '';
                document.getElementById('suggested-price').textContent = '500';

                showNotification('Item uploaded successfully! Pending admin approval.', 'success');
                loadDonorItems();
                updateDonorAnalytics();
            } else {
                showNotification('Error uploading item', 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            showNotification('Error uploading item', 'error');
        }
    });
}

async function loadDonorItems() {
    const itemsGrid = document.getElementById('items-grid');
    if (!itemsGrid) return;

    try {
        const result = await FirebaseAPI.getItems({ donorId: currentUser.id });
        if (result.success) {
            userItems = result.data;
        }

        if (userItems.length === 0) {
            itemsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box"></i>
                    <h3>No items uploaded yet</h3>
                    <p>Upload your first item to get started</p>
                </div>
            `;
            return;
        }

        itemsGrid.innerHTML = userItems.map(item => `
            <div class="item-card">
                <div class="item-image">
                    <img src="${item.images[0]}" alt="${item.name}">
                    <span class="status-badge status-${item.status}">${item.status}</span>
                </div>
                <div class="item-content">
                    <h3 class="item-title">${item.name}</h3>
                    <div class="item-details">
                        <span>${item.type}</span>
                        <span>${item.size}</span>
                        <span>${item.condition}</span>
                    </div>
                    <div class="item-price">${formatPrice(item.price)}</div>
                    <div class="item-meta">
                        <small>Uploaded: ${formatDate(item.createdAt)}</small>
                        ${item.freeForNGO ? '<small class="ngo-free">Free for NGO</small>' : ''}
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading donor items:', error);
    }
}

function updateDonorAnalytics() {
    const totalItemsElement = document.getElementById('total-items');
    const approvedItemsElement = document.getElementById('approved-items');
    const freeItemsElement = document.getElementById('free-items');
    const totalEarningsElement = document.getElementById('total-earnings');

    const totalItems = userItems.length;
    const approvedItems = userItems.filter(item => item.status === 'approved').length;
    const freeItems = userItems.filter(item => item.freeForNGO).length;
    const totalEarnings = userItems
        .filter(item => item.status === 'approved' && !item.freeForNGO)
        .reduce((total, item) => total + item.price, 0);

    if (totalItemsElement) totalItemsElement.textContent = totalItems;
    if (approvedItemsElement) approvedItemsElement.textContent = approvedItems;
    if (freeItemsElement) freeItemsElement.textContent = freeItems;
    if (totalEarningsElement) totalEarningsElement.textContent = formatPrice(totalEarnings);
}

// Customer Dashboard Functions
function _initCustomerDashboard() {
    initSidebarNavigation();
    loadProducts();
    initProductFilters();
    loadCartFromFirebase();
    loadWishlistFromFirebase();
}

async function loadProducts() {
    const productsGrid = document.getElementById('products-grid');
    if (!productsGrid) return;

    try {
        const result = await FirebaseAPI.getItems({ status: 'approved' });
        if (result.success) {
            products = result.data.filter(item => !item.freeForNGO); // Only paid items for customers
        }

        renderProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function renderProducts(productsToRender) {
    const productsGrid = document.getElementById('products-grid');
    if (!productsGrid) return;

    if (productsToRender.length === 0) {
        productsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-bag"></i>
                <h3>No products found</h3>
                <p>Try adjusting your search or filters</p>
            </div>
        `;
        return;
    }

    productsGrid.innerHTML = productsToRender.map(product => `
        <div class="product-card" onclick="openProductModal('${product.id}')">
            <div class="product-image">
                <img src="${product.images[0]}" alt="${product.name}">
                <button class="wishlist-heart ${isInWishlist(product.id) ? 'active' : ''}" onclick="event.stopPropagation(); toggleWishlist('${product.id}')">
                    <i class="fas fa-heart"></i>
                </button>
                <button class="cart-icon-btn" onclick="event.stopPropagation(); addToCart('${product.id}')">
                    <i class="fas fa-shopping-cart"></i>
                </button>
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <div class="product-details">
                    <span>${product.type}</span>
                    <span>${product.size}</span>
                    <span>${product.condition}</span>
                </div>
                <div class="product-pricing">
                    <span class="original-price">${formatPrice(product.originalPrice)}</span>
                    <span class="current-price">${formatPrice(product.price)}</span>
                </div>
                <button class="buy-now-bottom-btn" onclick="event.stopPropagation(); buyNow('${product.id}')">
                    Buy Now
                </button>
            </div>
        </div>
    `).join('');
}

function initProductFilters() {
    const filterType = document.getElementById('filter-type');
    const filterSize = document.getElementById('filter-size');
    const filterGender = document.getElementById('filter-gender');
    const filterPrice = document.getElementById('filter-price');
    const priceDisplay = document.getElementById('price-display');
    const searchInput = document.getElementById('search-input');

    if (filterPrice && priceDisplay) {
        filterPrice.addEventListener('input', (e) => {
            priceDisplay.textContent = formatPrice(e.target.value);
        });
    }

    // Global functions for filters
    window.applyFilters = function () {
        let filtered = [...products];

        if (filterType && filterType.value) {
            filtered = filtered.filter(p => p.type === filterType.value);
        }
        if (filterSize && filterSize.value) {
            filtered = filtered.filter(p => p.size === filterSize.value);
        }
        if (filterGender && filterGender.value) {
            filtered = filtered.filter(p => p.gender === filterGender.value);
        }
        if (filterPrice && filterPrice.value) {
            filtered = filtered.filter(p => p.price <= parseInt(filterPrice.value));
        }

        renderProducts(filtered);
    };

    window.clearFilters = function () {
        if (filterType) filterType.value = '';
        if (filterSize) filterSize.value = '';
        if (filterGender) filterGender.value = '';
        if (filterPrice) {
            filterPrice.value = '5000';
            priceDisplay.textContent = '₹5000';
        }
        if (searchInput) searchInput.value = '';
        renderProducts(products);
    };

    window.searchProducts = function () {
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const filtered = products.filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm) ||
            product.type.toLowerCase().includes(searchTerm)
        );
        renderProducts(filtered);
    };
}

async function loadCartFromFirebase() {
    if (!currentUser) return;

    try {
        const result = await FirebaseAPI.getCart(currentUser.id);
        if (result.success) {
            cart = result.data;
            updateCartUI();
        }
    } catch (error) {
        console.error('Error loading cart:', error);
    }
}

async function addToCart(productId) {
    if (!currentUser) {
        showNotification('Please login to add items to cart', 'error');
        return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Check if item already in cart
    if (cart.find(item => item.id === productId)) {
        showNotification('Item already in cart', 'info');
        return;
    }

    cart.push(product);

    try {
        await FirebaseAPI.saveCart(currentUser.id, cart);
        updateCartUI();
        showNotification('Item added to cart', 'success');
    } catch (error) {
        console.error('Error saving cart:', error);
        showNotification('Error adding item to cart', 'error');
    }
}

async function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);

    try {
        await FirebaseAPI.saveCart(currentUser.id, cart);
        updateCartUI();
        showNotification('Item removed from cart', 'success');
    } catch (error) {
        console.error('Error saving cart:', error);
    }
}

function toggleCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    if (cartSidebar) {
        cartSidebar.classList.toggle('open');
    }
}

function proceedToCheckout(items = null) {
    const itemsToCheckout = items || cart;
    if (itemsToCheckout.length === 0) {
        showNotification('Your cart is empty', 'error');
        return;
    }
    
    const total = itemsToCheckout.reduce((sum, item) => sum + item.price, 0);
    const platformFee = Math.round(total * 0.1);
    const deliveryFee = 50;
    const finalTotal = total + platformFee + deliveryFee;
    
    showNotification(`Processing payment for ${formatPrice(finalTotal)}. Checkout functionality would be implemented here.`, 'info');
}

function openProductModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById('product-modal');
    const modalBody = document.getElementById('modal-body');

    if (!modal || !modalBody) return;

    modalBody.innerHTML = `
        <div class="product-modal-content">
            <div class="product-images">
                <img src="${product.images[0]}" alt="${product.name}" style="width: 100%; border-radius: var(--radius-md);">
            </div>
            <div class="product-info">
                <h2>${product.name}</h2>
                <div class="product-details">
                    <span>Type: ${product.type}</span>
                    <span>Size: ${product.size}</span>
                    <span>Gender: ${product.gender}</span>
                    <span>Condition: ${product.condition}</span>
                </div>
                <div class="product-price">${formatPrice(product.price)}</div>
                <div class="price-breakdown">
                    <p>Original Price: ${formatPrice(product.originalPrice)}</p>
                    <p>Donor Price: ${formatPrice(product.price)}</p>
                    <p>Platform Fee: ₹50</p>
                    <p>Delivery Fee: ₹50</p>
                    <p><strong>Total: ${formatPrice(product.price + 100)}</strong></p>
                </div>
                <p class="product-description">${product.description}</p>
                <div class="product-actions" style="margin-top: var(--spacing-lg);">
                    <button class="btn btn-primary" onclick="addToCart('${product.id}'); closeProductModal();">
                        Add to Cart
                    </button>
                    <button class="btn btn-secondary" onclick="buyNow('${product.id}'); closeProductModal();">
                        <i class="fas fa-bolt"></i> Buy Now
                    </button>
                    <button class="btn btn-outline" onclick="toggleWishlist('${product.id}')">
                        <i class="fas fa-heart"></i> Wishlist
                    </button>
                </div>
            </div>
        </div>
    `;

    modal.classList.add('active');
}

function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function toggleWishlist(productId) {
    if (!currentUser) {
        showNotification('Please login to manage wishlist', 'error');
        return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingIndex = wishlist.findIndex(item => item.id === productId);
    
    if (existingIndex > -1) {
        wishlist.splice(existingIndex, 1);
        showNotification('Removed from wishlist', 'success');
    } else {
        wishlist.push(product);
        showNotification('Added to wishlist', 'success');
    }

    try {
        await FirebaseAPI.saveWishlist(currentUser.id, wishlist);
        updateWishlistUI();
        // Re-render products to update heart icons
        renderProducts(products);
    } catch (error) {
        console.error('Error saving wishlist:', error);
        showNotification('Error updating wishlist', 'error');
    }
}

async function loadWishlistFromFirebase() {
    if (!currentUser) return;

    try {
        const result = await FirebaseAPI.getWishlist(currentUser.id);
        if (result.success && result.data) {
            wishlist = result.data;
            updateWishlistUI();
            // Re-render products to update heart icons
            if (products.length > 0) {
                renderProducts(products);
            }
        }
    } catch (error) {
        console.error('Error loading wishlist:', error);
    }
}

function updateWishlistUI() {
    const wishlistGrid = document.getElementById('wishlist-grid');
    if (!wishlistGrid) return;

    if (wishlist.length === 0) {
        wishlistGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart"></i>
                <h3>Your wishlist is empty</h3>
                <p>Save items you love to buy them later</p>
            </div>
        `;
        return;
    }

    wishlistGrid.innerHTML = wishlist.map(item => `
        <div class="product-card" onclick="openProductModal('${item.id}')">
            <div class="product-image">
                <img src="${item.images[0]}" alt="${item.name}">
                <button class="wishlist-heart active" onclick="event.stopPropagation(); toggleWishlist('${item.id}')">
                    <i class="fas fa-heart"></i>
                </button>
                <button class="cart-icon-btn" onclick="event.stopPropagation(); addToCart('${item.id}')">
                    <i class="fas fa-shopping-cart"></i>
                </button>
            </div>
            <div class="product-info">
                <h3 class="product-title">${item.name}</h3>
                <div class="product-details">
                    <span>${item.type}</span>
                    <span>${item.size}</span>
                    <span>${item.condition}</span>
                </div>
                <div class="product-pricing">
                    <span class="original-price">${formatPrice(item.originalPrice)}</span>
                    <span class="current-price">${formatPrice(item.price)}</span>
                </div>
                <button class="buy-now-bottom-btn" onclick="event.stopPropagation(); buyNow('${item.id}')">
                    Buy Now
                </button>
            </div>
        </div>
    `).join('');
}

function buyNow(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    if (!currentUser) {
        showNotification('Please login to buy items', 'error');
        return;
    }
    
    // Create a temporary cart with just this item for checkout
    const buyNowItem = [product];
    proceedToCheckout(buyNowItem);
}

function isInWishlist(productId) {
    return wishlist.some(item => item.id === productId);
}

// Mobile sidebar functions
function toggleSidebar() {
    const sidebar = document.getElementById('dashboard-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('dashboard-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (sidebar) {
        sidebar.classList.remove('active');
    }
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// NGO Dashboard Functions
function _initNGODashboard() {
    initSidebarNavigation();
    initNGOVerificationForm();
    loadNGOStatus();
    loadAvailableDonations();
    initDocumentUpload();
}

async function initNGOVerificationForm() {
    const verificationForm = document.getElementById('ngo-verification-form');
    if (!verificationForm) return;

    verificationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        // Validation
        const requiredFields = ['ngoName', 'registrationNumber', 'contactPerson', 'designation', 'phone', 'email', 'address', 'serviceAreas', 'description'];
        for (let field of requiredFields) {
            if (!formData.get(field)) {
                showNotification(`Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`, 'error');
                return;
            }
        }

        try {
            // Create NGO request
            const ngoRequest = {
                id: generateId(),
                ngoName: formData.get('ngoName'),
                registrationNumber: formData.get('registrationNumber'),
                contactPerson: formData.get('contactPerson'),
                designation: formData.get('designation'),
                phone: formData.get('phone'),
                email: formData.get('email'),
                address: formData.get('address'),
                serviceAreas: formData.get('serviceAreas'),
                description: formData.get('description'),
                website: formData.get('website') || '',
                userId: currentUser.id,
                status: 'pending',
                submittedAt: Date.now()
            };

            const result = await FirebaseAPI.createNGORequest(ngoRequest);
            if (result.success) {
                // Update user with NGO status
                currentUser.ngoStatus = 'pending';
                currentUser.ngoId = ngoRequest.id;
                await FirebaseAPI.updateUser(currentUser.id, { ngoStatus: 'pending', ngoId: ngoRequest.id });

                showNotification('Verification request submitted successfully!', 'success');
                loadNGOStatus();
                verificationForm.style.display = 'none';
            } else {
                showNotification('Error submitting verification request', 'error');
            }
        } catch (error) {
            console.error('NGO verification error:', error);
            showNotification('Error submitting verification request', 'error');
        }
    });
}

function loadNGOStatus() {
    const statusContainer = document.getElementById('verification-status');
    const noticeContainer = document.getElementById('ngo-notice');
    const verificationForm = document.getElementById('ngo-verification-form');

    if (!statusContainer) return;

    if (currentUser.ngoStatus) {
        const statusClass = `status-${currentUser.ngoStatus}-verification`;
        const statusText = currentUser.ngoStatus === 'pending' ? 'Pending Verification' :
            currentUser.ngoStatus === 'approved' ? 'Verified NGO' : 'Verification Rejected';
        const statusIcon = currentUser.ngoStatus === 'pending' ? 'fas fa-clock' :
            currentUser.ngoStatus === 'approved' ? 'fas fa-check-circle' : 'fas fa-times-circle';

        statusContainer.innerHTML = `
            <div class="${statusClass}">
                <i class="${statusIcon}"></i>
                <h3>${statusText}</h3>
                <p>${currentUser.ngoStatus === 'pending' ? 'Your verification request is being reviewed by our admin team.' :
                currentUser.ngoStatus === 'approved' ? 'Your NGO has been verified. You can now access free donations.' :
                    'Your verification request was rejected. Please contact support for more information.'}</p>
            </div>
        `;

        if (verificationForm) {
            verificationForm.style.display = 'none';
        }

        if (noticeContainer) {
            if (currentUser.ngoStatus === 'approved') {
                noticeContainer.style.display = 'none';
            } else {
                noticeContainer.style.display = 'block';
            }
        }
    } else {
        statusContainer.innerHTML = `
            <div class="status-pending-verification">
                <i class="fas fa-info-circle"></i>
                <h3>Verification Required</h3>
                <p>Please complete the verification form below to access NGO features.</p>
            </div>
        `;
    }
}

async function loadAvailableDonations() {
    const donationsGrid = document.getElementById('donations-grid');
    if (!donationsGrid) return;

    if (currentUser.ngoStatus !== 'approved') {
        donationsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-lock"></i>
                <h3>Verification Required</h3>
                <p>Complete NGO verification to access free donations</p>
            </div>
        `;
        return;
    }

    try {
        const result = await FirebaseAPI.getItems({ status: 'approved', freeForNGO: true });
        if (result.success) {
            const freeDonations = result.data;

            if (freeDonations.length === 0) {
                donationsGrid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <h3>No donations available</h3>
                        <p>Check back later for new free donations</p>
                    </div>
                `;
                return;
            }

            donationsGrid.innerHTML = freeDonations.map(donation => `
                <div class="donation-card">
                    <div class="item-image">
                        <img src="${donation.images[0]}" alt="${donation.name}">
                        <span class="status-badge status-approved">Free</span>
                    </div>
                    <div class="item-content">
                        <h3 class="item-title">${donation.name}</h3>
                        <div class="item-details">
                            <span>${donation.type}</span>
                            <span>${donation.size}</span>
                            <span>${donation.condition}</span>
                        </div>
                        <p class="item-description">${donation.description}</p>
                        <button class="btn btn-primary btn-sm" onclick="requestDonation('${donation.id}')">
                            Request Pickup
                        </button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading donations:', error);
    }
}

function requestDonation(donationId) {
    showNotification('Pickup request sent! Donor will be notified.', 'success');
}

function initDocumentUpload() {
    const documentUploadArea = document.getElementById('document-upload-area');
    const documentInput = document.getElementById('document-input');
    const documentPreview = document.getElementById('document-preview');

    if (!documentUploadArea || !documentInput || !documentPreview) return;

    documentUploadArea.addEventListener('click', () => {
        documentInput.click();
    });

    documentInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                showNotification(`File ${file.name} is too large (max 5MB)`, 'error');
                return;
            }

            const fileDiv = document.createElement('div');
            fileDiv.className = 'document-item';
            fileDiv.innerHTML = `
                <i class="fas fa-file"></i>
                <span>${file.name}</span>
                <button type="button" onclick="removeDocument(this)">
                    <i class="fas fa-times"></i>
                </button>
            `;
            documentPreview.appendChild(fileDiv);
        });
    });

    window.removeDocument = function (button) {
        button.parentElement.remove();
    };
}

// Admin Portal Functions
function initAdminPortal() {
    const adminLogin = document.getElementById('admin-login');
    const adminDashboard = document.getElementById('admin-dashboard');
    const adminLoginForm = document.getElementById('admin-login-form');

    // Check if admin is already logged in
    if (currentUser && currentUser.role === 'admin') {
        if (adminLogin) adminLogin.style.display = 'none';
        if (adminDashboard) adminDashboard.style.display = 'block';
        initAdminDashboard();
    } else {
        if (adminLogin) adminLogin.style.display = 'flex';
        if (adminDashboard) adminDashboard.style.display = 'none';
    }

    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', handleAdminLogin);
    }
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get('username');
    const password = formData.get('password');

    // Admin credentials
    if ((username === 'admin' && password === 'admin123') || 
        (username === 'akinchan' && password === 'Akinchan2025@')) {
        currentUser = {
            id: username === 'akinchan' ? 'akinchan_admin' : 'admin',
            name: username === 'akinchan' ? 'Akinchan' : 'Admin',
            role: 'admin',
            email: username === 'akinchan' ? 'akinchan@clothesshare.com' : 'admin@clothesshare.com'
        };

        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        initAdminDashboard();
        showNotification('Admin login successful', 'success');
    } else {
        showNotification('Invalid admin credentials', 'error');
    }
}

async function initAdminDashboard() {
    initSidebarNavigation();
    await loadAdminData();
    loadAdminOverview();
    loadPendingItems();
    loadNGORequests();
    loadAllItems();
    loadApprovedNGOs();
}

async function loadAdminData() {
    try {
        // Load all items
        const itemsResult = await FirebaseAPI.getItems();
        if (itemsResult.success) {
            userItems = itemsResult.data;
        }

        // Load all NGO requests
        const ngoResult = await FirebaseAPI.getNGORequests();
        if (ngoResult.success) {
            ngoRequests = ngoResult.data;
        }
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

function loadAdminOverview() {
    const totalItems = userItems.length;
    const pendingItems = userItems.filter(item => item.status === 'pending').length;
    const totalUsers = 150; // Mock data
    const activeNGOs = ngoRequests.filter(ngo => ngo.status === 'approved').length;

    // Update stats
    const totalItemsStat = document.getElementById('total-items-stat');
    const pendingItemsStat = document.getElementById('pending-items-stat');
    const totalUsersStat = document.getElementById('total-users-stat');
    const ngosStat = document.getElementById('ngos-stat');
    const pendingCount = document.getElementById('pending-count');
    const ngoRequestsCount = document.getElementById('ngo-requests-count');

    if (totalItemsStat) totalItemsStat.textContent = totalItems;
    if (pendingItemsStat) pendingItemsStat.textContent = pendingItems;
    if (totalUsersStat) totalUsersStat.textContent = totalUsers;
    if (ngosStat) ngosStat.textContent = activeNGOs;
    if (pendingCount) {
        pendingCount.textContent = pendingItems;
        pendingCount.style.display = pendingItems > 0 ? 'inline' : 'none';
    }
    if (ngoRequestsCount) {
        const pendingNGOs = ngoRequests.filter(ngo => ngo.status === 'pending').length;
        ngoRequestsCount.textContent = pendingNGOs;
        ngoRequestsCount.style.display = pendingNGOs > 0 ? 'inline' : 'none';
    }

    // Load recent activity
    loadRecentActivity();
}

function loadRecentActivity() {
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;

    const activities = [
        { icon: 'fas fa-plus', text: 'New item uploaded by donor', time: '2 hours ago' },
        { icon: 'fas fa-check', text: 'Item approved and listed', time: '4 hours ago' },
        { icon: 'fas fa-users', text: 'New NGO registration request', time: '6 hours ago' },
        { icon: 'fas fa-shopping-cart', text: 'Purchase completed', time: '8 hours ago' }
    ];

    activityList.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <i class="activity-icon ${activity.icon}"></i>
            <div class="activity-content">
                <p>${activity.text}</p>
                <span class="activity-time">${activity.time}</span>
            </div>
        </div>
    `).join('');
}

function loadPendingItems() {
    const pendingItemsGrid = document.getElementById('pending-items-grid');
    if (!pendingItemsGrid) return;

    const pendingItems = userItems.filter(item => item.status === 'pending');

    if (pendingItems.length === 0) {
        pendingItemsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <h3>No pending items</h3>
                <p>All items have been reviewed</p>
            </div>
        `;
        return;
    }

    pendingItemsGrid.innerHTML = pendingItems.map(item => `
        <div class="admin-item-card">
            <div class="item-image">
                <img src="${item.images[0]}" alt="${item.name}">
            </div>
            <div class="item-content">
                <h3 class="item-title">${item.name}</h3>
                <div class="item-details">
                    <span>Type: ${item.type}</span>
                    <span>Size: ${item.size}</span>
                    <span>Condition: ${item.condition}</span>
                </div>
                <p class="item-description">${item.description}</p>
                <div class="item-meta">
                    <small>Donor: ${item.donor}</small>
                    <small>Price: ${formatPrice(item.price)}</small>
                    <small>Uploaded: ${formatDate(item.createdAt)}</small>
                </div>
            </div>
            <div class="admin-item-actions">
                <button class="btn btn-primary btn-sm" onclick="approveItem('${item.id}')">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="btn btn-outline btn-sm" onclick="rejectItem('${item.id}')">
                    <i class="fas fa-times"></i> Reject
                </button>
                <button class="btn btn-secondary btn-sm" onclick="reviewItem('${item.id}')">
                    <i class="fas fa-eye"></i> Review
                </button>
            </div>
        </div>
    `).join('');
}

async function approveItem(itemId) {
    try {
        const result = await FirebaseAPI.updateItem(itemId, { status: 'approved' });
        if (result.success) {
            showNotification('Item approved successfully', 'success');
            await loadAdminData();
            loadPendingItems();
            loadAdminOverview();
        } else {
            showNotification('Error approving item', 'error');
        }
    } catch (error) {
        console.error('Error approving item:', error);
        showNotification('Error approving item', 'error');
    }
}

async function rejectItem(itemId) {
    try {
        const result = await FirebaseAPI.updateItem(itemId, { status: 'rejected' });
        if (result.success) {
            showNotification('Item rejected', 'success');
            await loadAdminData();
            loadPendingItems();
            loadAdminOverview();
        } else {
            showNotification('Error rejecting item', 'error');
        }
    } catch (error) {
        console.error('Error rejecting item:', error);
        showNotification('Error rejecting item', 'error');
    }
}

function reviewItem(itemId) {
    const item = userItems.find(i => i.id === itemId);
    if (!item) return;

    const modal = document.getElementById('item-review-modal');
    const modalBody = document.getElementById('item-review-body');

    if (!modal || !modalBody) return;

    modalBody.innerHTML = `
        <div class="item-review-detail">
            <div class="review-images">
                <img src="${item.images[0]}" alt="${item.name}" style="width: 100%; border-radius: var(--radius-md);">
            </div>
            <div class="review-info">
                <h2>${item.name}</h2>
                <div class="review-details">
                    <p><strong>Type:</strong> ${item.type}</p>
                    <p><strong>Size:</strong> ${item.size}</p>
                    <p><strong>Gender:</strong> ${item.gender}</p>
                    <p><strong>Condition:</strong> ${item.condition}</p>
                    <p><strong>Original Price:</strong> ${formatPrice(item.originalPrice)}</p>
                    <p><strong>Selling Price:</strong> ${formatPrice(item.price)}</p>
                    <p><strong>Donor:</strong> ${item.donor}</p>
                    <p><strong>Free for NGO:</strong> ${item.freeForNGO ? 'Yes' : 'No'}</p>
                    <p><strong>Uploaded:</strong> ${formatDate(item.createdAt)}</p>
                </div>
                <div class="review-description">
                    <h4>Description:</h4>
                    <p>${item.description || 'No description provided'}</p>
                </div>
                <div class="review-actions" style="margin-top: var(--spacing-lg);">
                    <button class="btn btn-primary" onclick="approveItem('${item.id}'); closeItemReviewModal();">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn btn-outline" onclick="rejectItem('${item.id}'); closeItemReviewModal();">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            </div>
        </div>
    `;

    modal.classList.add('active');
}

function closeItemReviewModal() {
    const modal = document.getElementById('item-review-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function loadNGORequests() {
    const ngoRequestsList = document.getElementById('ngo-requests-list');
    if (!ngoRequestsList) return;

    const pendingRequests = ngoRequests.filter(ngo => ngo.status === 'pending');

    if (pendingRequests.length === 0) {
        ngoRequestsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <h3>No pending NGO requests</h3>
                <p>All NGO applications have been reviewed</p>
            </div>
        `;
        return;
    }

    ngoRequestsList.innerHTML = pendingRequests.map(ngo => `
        <div class="ngo-request-card">
            <div class="ngo-request-header">
                <h3>${ngo.ngoName}</h3>
                <span class="status-badge status-pending">${ngo.status}</span>
            </div>
            <div class="ngo-request-details">
                <div class="detail-item">
                    <strong>Registration No:</strong> ${ngo.registrationNumber}
                </div>
                <div class="detail-item">
                    <strong>Contact Person:</strong> ${ngo.contactPerson} (${ngo.designation})
                </div>
                <div class="detail-item">
                    <strong>Phone:</strong> ${ngo.phone}
                </div>
                <div class="detail-item">
                    <strong>Email:</strong> ${ngo.email}
                </div>
                <div class="detail-item">
                    <strong>Address:</strong> ${ngo.address}
                </div>
                <div class="detail-item">
                    <strong>Service Areas:</strong> ${ngo.serviceAreas}
                </div>
            </div>
            <div class="ngo-description">
                <h4>About NGO:</h4>
                <p>${ngo.description}</p>
            </div>
            <div class="ngo-request-actions">
                <button class="btn btn-primary btn-sm" onclick="approveNGO('${ngo.id}')">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="btn btn-outline btn-sm" onclick="rejectNGO('${ngo.id}')">
                    <i class="fas fa-times"></i> Reject
                </button>
            </div>
        </div>
    `).join('');
}

async function approveNGO(ngoId) {
    try {
        const result = await FirebaseAPI.updateNGORequest(ngoId, { status: 'approved' });
        if (result.success) {
            showNotification('NGO approved successfully', 'success');
            await loadAdminData();
            loadNGORequests();
            loadAdminOverview();
        } else {
            showNotification('Error approving NGO', 'error');
        }
    } catch (error) {
        console.error('Error approving NGO:', error);
        showNotification('Error approving NGO', 'error');
    }
}

async function rejectNGO(ngoId) {
    try {
        const result = await FirebaseAPI.updateNGORequest(ngoId, { status: 'rejected' });
        if (result.success) {
            showNotification('NGO request rejected', 'success');
            await loadAdminData();
            loadNGORequests();
            loadAdminOverview();
        } else {
            showNotification('Error rejecting NGO', 'error');
        }
    } catch (error) {
        console.error('Error rejecting NGO:', error);
        showNotification('Error rejecting NGO', 'error');
    }
}

function loadAllItems() {
    // Use the new loadAllItemsTable function for consistency
    loadAllItemsTable();
}

function loadApprovedNGOs() {
    const approvedNGOsGrid = document.getElementById('approved-ngos-grid');
    if (!approvedNGOsGrid) return;

    const approvedNGOs = ngoRequests.filter(ngo => ngo.status === 'approved');

    if (approvedNGOs.length === 0) {
        approvedNGOsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No approved NGOs</h3>
                <p>Approved NGOs will appear here</p>
            </div>
        `;
        return;
    }

    approvedNGOsGrid.innerHTML = approvedNGOs.map(ngo => `
        <div class="approved-ngo-card">
            <div class="ngo-info">
                <h3>${ngo.ngoName}</h3>
                <p><strong>Contact:</strong> ${ngo.contactPerson}</p>
                <p><strong>Phone:</strong> ${ngo.phone}</p>
                <p><strong>Email:</strong> ${ngo.email}</p>
                <p><strong>Service Areas:</strong> ${ngo.serviceAreas}</p>
                <span class="status-badge status-approved">Verified</span>
            </div>
        </div>
    `).join('');
}

function filterItems() {
    const statusFilter = document.getElementById('status-filter');
    const typeFilter = document.getElementById('type-filter');
    
    if (!statusFilter || !typeFilter) return;
    
    let filtered = [...userItems];
    
    if (statusFilter.value) {
        filtered = filtered.filter(item => item.status === statusFilter.value);
    }
    
    if (typeFilter.value) {
        filtered = filtered.filter(item => item.type === typeFilter.value);
    }
    
    // Update the all items table with filtered data
    loadAllItemsTable(filtered);
}

function loadAllItemsTable(items = userItems) {
    const tableBody = document.getElementById('items-table-body');
    if (!tableBody) return;
    
    if (!items.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: var(--spacing-lg);">
                    <div class="empty-state">
                        <i class="fas fa-box"></i>
                        <h3>No items found</h3>
                        <p>No items match the current filters</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = items.map(item => `
        <tr>
            <td>
                <div class="item-preview">
                    <img src="${item.images[0]}" alt="${item.name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: var(--radius-sm);">
                    <span>${item.name}</span>
                </div>
            </td>
            <td>${item.donor}</td>
            <td>${item.type}</td>
            <td>${formatPrice(item.price)}</td>
            <td><span class="status-badge status-${item.status}">${item.status}</span></td>
            <td>${formatDate(item.createdAt)}</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="approveItem('${item.id}')">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn btn-outline btn-sm" onclick="rejectItem('${item.id}')">
                    <i class="fas fa-times"></i>
                </button>
                <button class="btn btn-secondary btn-sm" onclick="reviewItem('${item.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Global functions for UI interactions
window.approveItem = approveItem;
window.rejectItem = rejectItem;
window.reviewItem = reviewItem;
window.closeItemReviewModal = closeItemReviewModal;
window.approveNGO = approveNGO;
window.rejectNGO = rejectNGO;
window.initAdminPortal = initAdminPortal;
window.filterItems = filterItems;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.toggleCart = toggleCart;
window.toggleWishlist = toggleWishlist;
window.buyNow = buyNow;
window.proceedToCheckout = proceedToCheckout;
window.isInWishlist = isInWishlist;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.proceedToCheckout = proceedToCheckout;
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.toggleWishlist = toggleWishlist;
window.requestDonation = requestDonation;
window.logout = logout;

// Initialize sidebar toggle for dashboard pages
function initSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarClose = document.getElementById('sidebar-close');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    if (sidebarClose) {
        sidebarClose.addEventListener('click', closeSidebar);
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }
}