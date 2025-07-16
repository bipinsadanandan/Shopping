// frontend/js/auth.js
class Auth {
    constructor() {
        this.user = null;
        this.token = localStorage.getItem('authToken');
        this.init();
    }

    async init() {
        if (this.token) {
            try {
                const { user } = await api.getProfile();
                this.user = user;
                this.updateUI();
            } catch (error) {
                console.error('Failed to load user profile:', error);
                this.logout();
            }
        }
    }

    async register(formData) {
        try {
            const response = await api.register(formData);
            this.user = response.user;
            this.token = response.token;
            this.updateUI();
            showAlert('Registration successful! Welcome to ShopEase.', 'success');
            navigateTo('products');
            return true;
        } catch (error) {
            showAlert(error.message || 'Registration failed', 'danger');
            return false;
        }
    }

    async login(credentials) {
        try {
            const response = await api.login(credentials);
            this.user = response.user;
            this.token = response.token;
            this.updateUI();
            showAlert('Login successful!', 'success');
            
            // Redirect based on role
            if (this.user.role === 'admin') {
                navigateTo('products'); // Go to products where admin can manage
            } else {
                navigateTo('products');
            }
            return true;
        } catch (error) {
            showAlert(error.message || 'Login failed', 'danger');
            return false;
        }
    }

    logout() {
        this.user = null;
        this.token = null;
        api.clearToken();
        this.updateUI();
        showAlert('Logged out successfully', 'info');
        navigateTo('home');
    }

    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    isAdmin() {
        return this.user && this.user.role === 'admin';
    }

    updateUI() {
        const navAuth = document.getElementById('nav-auth');
        const adminLink = document.getElementById('admin-link');
        
        if (this.isAuthenticated()) {
            navAuth.innerHTML = `
                <span class="text-muted">Welcome, ${this.user.username}</span>
                <a href="#" class="nav-link" onclick="navigateTo('orders'); return false;">Orders</a>
                <a href="#" class="nav-link" onclick="navigateTo('profile'); return false;">Profile</a>
                <a href="#" class="nav-link" onclick="auth.logout(); return false;">Logout</a>
            `;

            // Show admin link if user is admin
            if (adminLink) {
                adminLink.style.display = this.isAdmin() ? 'block' : 'none';
            }

            // Show/hide admin controls throughout the page
            this.updateAdminControls();
        } else {
            navAuth.innerHTML = `
                <a href="#" class="nav-link" onclick="navigateTo('login'); return false;">Login</a>
                <a href="#" class="nav-link" onclick="navigateTo('register'); return false;">Register</a>
            `;

            if (adminLink) {
                adminLink.style.display = 'none';
            }
            
            // Hide all admin controls
            this.updateAdminControls();
        }

        // Update cart badge
        if (this.isAuthenticated()) {
            cart.updateBadge();
        }
    }

    updateAdminControls() {
        const adminControls = document.querySelectorAll('.admin-only');
        const adminProductControls = document.getElementById('admin-product-controls');
        
        if (this.isAdmin()) {
            adminControls.forEach(control => {
                control.style.display = 'block';
            });
            if (adminProductControls) {
                adminProductControls.style.display = 'block';
            }
        } else {
            adminControls.forEach(control => {
                control.style.display = 'none';
            });
            if (adminProductControls) {
                adminProductControls.style.display = 'none';
            }
        }
    }

    requireAuth(callback) {
        if (!this.isAuthenticated()) {
            showAlert('Please login to continue', 'warning');
            navigateTo('login');
            return false;
        }
        if (callback) callback();
        return true;
    }

    requireAdmin(callback) {
        if (!this.isAdmin()) {
            showAlert('Admin access required', 'danger');
            navigateTo('home');
            return false;
        }
        if (callback) callback();
        return true;
    }
}

// Create global auth instance
window.auth = new Auth();