// frontend/js/products.js
class Products {
    constructor() {
        this.currentPage = 1;
        this.filters = {
            search: '',
            category: '',
            minPrice: '',
            maxPrice: '',
            sortBy: 'created_at',
            order: 'DESC'
        };
        this.searchTimeout = null; // Make it a class property
    }

    async loadProducts(page = 1) {
        this.currentPage = page;
        showLoading('products-grid');

        // Build params object, excluding empty values
        const params = {
            page: this.currentPage,
            limit: 12
        };

        // Only add non-empty filter values
        if (this.filters.search) params.search = this.filters.search;
        if (this.filters.category) params.category = this.filters.category;
        if (this.filters.minPrice) params.minPrice = this.filters.minPrice;
        if (this.filters.maxPrice) params.maxPrice = this.filters.maxPrice;
        if (this.filters.sortBy) params.sortBy = this.filters.sortBy;
        if (this.filters.order) params.order = this.filters.order;

        try {
            const response = await api.getProducts(params);
            this.renderProducts(response.products);
            this.renderPagination(response.pagination);
            this.loadCategories();
        } catch (error) {
            showAlert('Failed to load products', 'danger');
            console.error('Products error:', error);
        }
    }

    renderProducts(products) {
        const container = document.getElementById('products-grid');
        
        if (!products || products.length === 0) {
            container.innerHTML = `
                <div class="text-center p-5 col-12">
                    <h3>No products found</h3>
                    <p class="text-muted">Try adjusting your filters or search terms</p>
                    <button class="btn btn-primary" onclick="products.resetFilters()">Reset Filters</button>
                </div>
            `;
            return;
        }

        let html = '';
        products.forEach(product => {
            // Use a working placeholder image service
            const imageUrl = product.image_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjE1MCIgeT0iMTAwIiBzdHlsZT0iZmlsbDojYWFhO2ZvbnQtd2VpZ2h0OmJvbGQ7Zm9udC1zaXplOjE5cHg7Zm9udC1mYW1pbHk6QXJpYWwsSGVsdmV0aWNhLHNhbnMtc2VyaWY7ZG9taW5hbnQtYmFzZWxpbmU6Y2VudHJhbCI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
            
            html += `
                <div class="product-card">
                    <img src="${imageUrl}" 
                         alt="${product.name}" 
                         class="product-image"
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjE1MCIgeT0iMTAwIiBzdHlsZT0iZmlsbDojYWFhO2ZvbnQtd2VpZ2h0OmJvbGQ7Zm9udC1zaXplOjE5cHg7Zm9udC1mYW1pbHk6QXJpYWwsSGVsdmV0aWNhLHNhbnMtc2VyaWY7ZG9taW5hbnQtYmFzZWxpbmU6Y2VudHJhbCI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+'">
                    
                    <div class="product-body">
                        <h4 class="product-title">${product.name}</h4>
                        <p class="product-description">${product.description || 'No description available'}</p>
                        
                        <div class="product-rating">
                            ${this.renderStars(product.avgRating || 0)}
                            <small class="text-muted">(${product.reviewCount || 0} reviews)</small>
                        </div>
                        
                        <p class="product-price">${this.formatPrice(product.price)}</p>
                        
                        <p class="product-stock ${product.stock_quantity < 10 ? 'text-danger' : 'text-success'}">
                            ${product.stock_quantity > 0 ? 
                                `${product.stock_quantity} in stock` : 
                                'Out of stock'}
                        </p>
                        
                        <div class="product-actions">
                            ${product.stock_quantity > 0 && auth.isAuthenticated() ? `
                                <button class="btn btn-primary btn-block" 
                                        onclick="cart.addToCart(${product.id})">
                                    Add to Cart
                                </button>
                            ` : product.stock_quantity === 0 ? `
                                <button class="btn btn-secondary btn-block" disabled>
                                    Out of Stock
                                </button>
                            ` : `
                                <button class="btn btn-primary btn-block" 
                                        onclick="navigateTo('login')">
                                    Login to Shop
                                </button>
                            `}
                            
                            ${auth.isAdmin() ? `
                                <div class="admin-only mt-2">
                                    <button class="btn btn-sm btn-warning" 
                                            onclick="products.editProduct(${product.id})">
                                        Edit
                                    </button>
                                    <button class="btn btn-sm btn-danger" 
                                            onclick="products.deleteProduct(${product.id})">
                                        Delete
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    renderPagination(pagination) {
        createPagination('products-pagination', pagination.page, pagination.totalPages, 'products.loadProducts');
    }

    async loadCategories() {
        try {
            const response = await api.getCategories();
            const select = document.getElementById('category-filter');
            
            let html = '<option value="">All Categories</option>';
            response.categories.forEach(cat => {
                html += `<option value="${cat.category}" ${this.filters.category === cat.category ? 'selected' : ''}>
                    ${cat.category} (${cat.count})
                </option>`;
            });
            
            select.innerHTML = html;
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    }

    applyFilters() {
        // Get filter values
        this.filters.search = document.getElementById('search-input').value.trim();
        this.filters.category = document.getElementById('category-filter').value;
        this.filters.minPrice = document.getElementById('min-price').value;
        this.filters.maxPrice = document.getElementById('max-price').value;
        
        const sortValue = document.getElementById('sort-by').value;
        const [sortBy, order] = sortValue.split('-');
        this.filters.sortBy = sortBy;
        this.filters.order = order;

        // Reload products with filters
        this.loadProducts(1);
    }

    resetFilters() {
        // Reset filter values
        this.filters = {
            search: '',
            category: '',
            minPrice: '',
            maxPrice: '',
            sortBy: 'created_at',
            order: 'DESC'
        };

        // Reset form inputs
        document.getElementById('search-input').value = '';
        document.getElementById('category-filter').value = '';
        document.getElementById('min-price').value = '';
        document.getElementById('max-price').value = '';
        document.getElementById('sort-by').value = 'created_at-DESC';

        // Reload products
        this.loadProducts(1);
    }

    async searchProducts(query) {
        this.filters.search = query;
        this.loadProducts(1);
    }

    // Handle search with debounce
    handleSearch(event) {
        clearTimeout(this.searchTimeout);
        const query = event.target.value;
        
        this.searchTimeout = setTimeout(() => {
            if (query.length >= 2 || query.length === 0) {
                this.searchProducts(query);
            }
        }, 300);
    }

    // Admin functions
    async createProduct() {
        if (!auth.requireAdmin()) return;

        // Remove any existing modal first
        const existingModal = document.getElementById('product-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalHtml = `
            <div id="product-modal" class="modal show" style="display: block; background-color: rgba(0,0,0,0.5);">
                <div class="modal-dialog" style="margin-top: 50px;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Create New Product</h5>
                            <button type="button" class="close" onclick="hideModal('product-modal')" style="background: none; border: none; font-size: 1.5rem;">
                                <span>&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <form id="product-form">
                                <div class="form-group">
                                    <label for="product-name">Product Name</label>
                                    <input type="text" class="form-control" id="product-name" name="product-name" required>
                                    <div class="invalid-feedback">Product name is required</div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="product-description">Description</label>
                                    <textarea class="form-control" id="product-description" name="product-description" rows="3"></textarea>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label for="product-price">Price</label>
                                            <input type="number" class="form-control" id="product-price" name="product-price"
                                                   step="0.01" min="0" required>
                                            <div class="invalid-feedback">Valid price is required</div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label for="product-stock">Stock Quantity</label>
                                            <input type="number" class="form-control" id="product-stock" name="product-stock"
                                                   min="0" required value="0">
                                            <div class="invalid-feedback">Stock quantity is required</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="product-category">Category</label>
                                    <input type="text" class="form-control" id="product-category" name="product-category"
                                           placeholder="e.g., Electronics, Clothing, etc.">
                                </div>
                                
                                <div class="form-group">
                                    <label for="product-image">Image URL</label>
                                    <input type="url" class="form-control" id="product-image" name="product-image"
                                           placeholder="https://example.com/image.jpg">
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="hideModal('product-modal')">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="products.saveProduct()">Create Product</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    async saveProduct(productId = null) {
        const form = document.getElementById('product-form');
        if (!form) {
            showAlert('Form not found', 'danger');
            return;
        }

        // Basic validation
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const productData = {
            name: document.getElementById('product-name').value.trim(),
            description: document.getElementById('product-description').value.trim(),
            price: parseFloat(document.getElementById('product-price').value),
            stock_quantity: parseInt(document.getElementById('product-stock').value),
            category: document.getElementById('product-category').value.trim(),
            image_url: document.getElementById('product-image').value.trim()
        };

        try {
            if (productId) {
                await api.updateProduct(productId, productData);
                showAlert('Product updated successfully', 'success');
            } else {
                await api.createProduct(productData);
                showAlert('Product created successfully', 'success');
            }
            
            hideModal('product-modal');
            this.loadProducts(this.currentPage);
        } catch (error) {
            showAlert(error.message || 'Failed to save product', 'danger');
        }
    }

    async editProduct(productId) {
        if (!auth.requireAdmin()) return;

        try {
            const product = await api.getProduct(productId);
            
            // Create modal with product data
            this.createProduct();
            
            // Fill form with product data
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-description').value = product.description || '';
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-stock').value = product.stock_quantity;
            document.getElementById('product-category').value = product.category || '';
            document.getElementById('product-image').value = product.image_url || '';
            
            // Update modal title and button
            document.querySelector('#product-modal .modal-title').textContent = 'Edit Product';
            document.querySelector('#product-modal .btn-primary').textContent = 'Update Product';
            document.querySelector('#product-modal .btn-primary').onclick = () => this.saveProduct(productId);
        } catch (error) {
            showAlert('Failed to load product details', 'danger');
        }
    }

    async deleteProduct(productId) {
        if (!auth.requireAdmin()) return;
        
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            await api.deleteProduct(productId);
            showAlert('Product deleted successfully', 'success');
            this.loadProducts(this.currentPage);
        } catch (error) {
            showAlert(error.message || 'Failed to delete product', 'danger');
        }
    }

    // Helper methods
    formatPrice(price) {
        if (typeof price === 'string') {
            price = parseFloat(price);
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(price || 0);
    }

    renderStars(rating, maxStars = 5) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = maxStars - fullStars - (hasHalfStar ? 1 : 0);

        let html = '<span class="stars">';
        
        // Full stars
        for (let i = 0; i < fullStars; i++) {
            html += '★';
        }
        
        // Half star
        if (hasHalfStar) {
            html += '☆';
        }
        
        // Empty stars
        for (let i = 0; i < emptyStars; i++) {
            html += '☆';
        }
        
        html += '</span>';
        return html;
    }
}

// Create global products instance
window.products = new Products();

// Make handleSearch available globally but use the class method
window.handleSearch = function(event) {
    products.handleSearch(event);
};

// Global helper function for hideModal
window.hideModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
};