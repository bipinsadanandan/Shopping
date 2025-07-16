// frontend/js/api.js
class API {
    constructor() {
        this.baseURL = 'http://localhost:3000/api';
        this.token = localStorage.getItem('authToken');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('authToken');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        };

        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth endpoints
    async register(userData) {
        const response = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
        this.setToken(response.token);
        return response;
    }

    async login(credentials) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
        this.setToken(response.token);
        return response;
    }

    async getProfile() {
        return await this.request('/auth/profile');
    }

    async updateProfile(updates) {
        return await this.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }

    // Product endpoints
    async getProducts(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/products${queryString ? `?${queryString}` : ''}`);
    }

    async getProduct(id) {
        return await this.request(`/products/${id}`);
    }

    async createProduct(productData) {
        return await this.request('/products', {
            method: 'POST',
            body: JSON.stringify(productData),
        });
    }

    async updateProduct(id, updates) {
        return await this.request(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }

    async deleteProduct(id) {
        return await this.request(`/products/${id}`, {
            method: 'DELETE',
        });
    }

    async getCategories() {
        return await this.request('/products/categories');
    }

    async searchProducts(query) {
        return await this.request(`/products/search?q=${encodeURIComponent(query)}`);
    }

    // Cart endpoints
    async getCart() {
        return await this.request('/cart');
    }

    async addToCart(productId, quantity = 1) {
        return await this.request('/cart/items', {
            method: 'POST',
            body: JSON.stringify({ product_id: productId, quantity }),
        });
    }

    async updateCartItem(itemId, quantity) {
        return await this.request(`/cart/items/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify({ quantity }),
        });
    }

    async removeFromCart(itemId) {
        return await this.request(`/cart/items/${itemId}`, {
            method: 'DELETE',
        });
    }

    async clearCart() {
        return await this.request('/cart/clear', {
            method: 'DELETE',
        });
    }

    // Order endpoints
    async createOrder(orderData) {
        return await this.request('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData),
        });
    }

    async getOrders(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/orders${queryString ? `?${queryString}` : ''}`);
    }

    async getOrder(id) {
        return await this.request(`/orders/${id}`);
    }

    async cancelOrder(id) {
        return await this.request(`/orders/${id}/cancel`, {
            method: 'POST',
        });
    }

    async getOrderAnalytics() {
        return await this.request('/orders/analytics/summary');
    }

    // Review endpoints
    async getProductReviews(productId, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/reviews/products/${productId}${queryString ? `?${queryString}` : ''}`);
    }

    async createReview(productId, reviewData) {
        return await this.request(`/reviews/products/${productId}`, {
            method: 'POST',
            body: JSON.stringify(reviewData),
        });
    }

    async updateReview(id, updates) {
        return await this.request(`/reviews/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }

    async deleteReview(id) {
        return await this.request(`/reviews/${id}`, {
            method: 'DELETE',
        });
    }
}

// Create global API instance
window.api = new API();