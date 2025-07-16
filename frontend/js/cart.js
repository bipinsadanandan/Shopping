class Cart {
    constructor() {
        this.items = [];
        this.total = 0;
        this.itemCount = 0;
    }

    async loadCart() {
        if (!auth.isAuthenticated()) {
            showAlert('Please login to view your cart', 'warning');
            navigateTo('login');
            return;
        }

        showLoading('cart-content');

        try {
            const response = await api.getCart();
            this.items = response.cart.items;
            this.total = response.cart.total;
            this.itemCount = response.cart.totalQuantity;
            this.renderCart(response.cart);
            this.updateBadge();
        } catch (error) {
            showAlert('Failed to load cart', 'danger');
            console.error('Cart error:', error);
        }
    }

    renderCart(cart) {
        const container = document.getElementById('cart-content');
        
        if (!cart.items || cart.items.length === 0) {
            container.innerHTML = `
                <div class="text-center p-5">
                    <h3>Your cart is empty</h3>
                    <p class="text-muted">Start shopping to add items to your cart</p>
                    <button class="btn btn-primary" onclick="navigateTo('products')">Continue Shopping</button>
                </div>
            `;
            return;
        }

        let html = '<div class="cart-items">';
        
        cart.items.forEach(item => {
            html += `
                <div class="cart-item" id="cart-item-${item.id}">
                    <img src="${item.image_url || 'https://via.placeholder.com/80'}" 
                         alt="${item.name}" 
                         class="cart-item-image"
                         onerror="handleImageError(this)">
                    
                    <div class="cart-item-details">
                        <h5 class="cart-item-title">${item.name}</h5>
                        <p class="cart-item-price">
                            Price: ${formatPrice(item.price_at_time)}
                            ${item.current_price !== item.price_at_time ? 
                                `<small class="text-muted">(Current: ${formatPrice(item.current_price)})</small>` : ''}
                        </p>
                        <p class="text-muted">Category: ${item.category || 'Uncategorized'}</p>
                    </div>
                    
                    <div class="cart-item-actions">
                        <div class="quantity-controls">
                            <button class="quantity-btn" onclick="cart.updateQuantity(${item.id}, ${item.quantity - 1})">-</button>
                            <span class="quantity-value">${item.quantity}</span>
                            <button class="quantity-btn" onclick="cart.updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
                        </div>
                        
                        <div class="item-subtotal">
                            <strong>${item.subtotal}</strong>
                        </div>
                        
                        <button class="btn btn-sm btn-danger" onclick="cart.removeItem(${item.id})">Remove</button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        // Cart Summary
        html += `
            <div class="cart-summary mt-4">
                <div class="row">
                    <div class="col-md-6">
                        <button class="btn btn-outline-secondary" onclick="cart.clearCart()">Clear Cart</button>
                        <button class="btn btn-outline-primary" onclick="navigateTo('products')">Continue Shopping</button>
                    </div>
                    <div class="col-md-6 text-right">
                        <p class="mb-1">Subtotal: <strong>${cart.subtotal}</strong></p>
                        <p class="mb-1">Tax (8%): <strong>${cart.tax}</strong></p>
                        <h4>Total: <strong>${cart.total}</strong></h4>
                        <button class="btn btn-lg btn-success btn-block mt-3" onclick="cart.checkout()">
                            Proceed to Checkout
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }

    async addToCart(productId, quantity = 1) {
        if (!auth.requireAuth()) return;

        try {
            const response = await api.addToCart(productId, quantity);
            showAlert(response.message, 'success');
            this.updateBadge();
            
            // Animate cart badge
            const badge = document.getElementById('cart-badge');
            if (badge) {
                badge.classList.add('pulse');
                setTimeout(() => badge.classList.remove('pulse'), 600);
            }
        } catch (error) {
            showAlert(error.message || 'Failed to add item to cart', 'danger');
        }
    }

    async updateQuantity(itemId, newQuantity) {
        if (newQuantity < 1) {
            return this.removeItem(itemId);
        }

        try {
            await api.updateCartItem(itemId, newQuantity);
            await this.loadCart();
        } catch (error) {
            showAlert(error.message || 'Failed to update quantity', 'danger');
        }
    }

    async removeItem(itemId) {
        if (!confirm('Remove this item from cart?')) return;

        try {
            await api.removeFromCart(itemId);
            showAlert('Item removed from cart', 'info');
            await this.loadCart();
        } catch (error) {
            showAlert('Failed to remove item', 'danger');
        }
    }

    async clearCart() {
        if (!confirm('Clear all items from cart?')) return;

        try {
            await api.clearCart();
            showAlert('Cart cleared', 'info');
            await this.loadCart();
        } catch (error) {
            showAlert('Failed to clear cart', 'danger');
        }
    }

    async updateBadge() {
        if (!auth.isAuthenticated()) {
            document.getElementById('cart-badge').textContent = '0';
            return;
        }

        try {
            const response = await api.getCart();
            const badge = document.getElementById('cart-badge');
            if (badge) {
                badge.textContent = response.cart.totalQuantity || 0;
            }
        } catch (error) {
            console.error('Failed to update cart badge:', error);
        }
    }

    async checkout() {
        if (!auth.requireAuth()) return;

        // Show checkout modal
        const modalHtml = `
            <div id="checkout-modal" class="modal show">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Checkout</h5>
                            <button type="button" class="close" onclick="hideModal('checkout-modal')">
                                <span>&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <form id="checkout-form">
                                <div class="form-group">
                                    <label for="shipping-address">Shipping Address</label>
                                    <textarea class="form-control" id="shipping-address" rows="3" required
                                        placeholder="123 Main St&#10;Apt 4B&#10;New York, NY 10001"></textarea>
                                    <div class="invalid-feedback">Please provide a shipping address</div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="payment-method">Payment Method</label>
                                    <select class="form-control" id="payment-method" required>
                                        <option value="">Select payment method</option>
                                        <option value="credit_card">Credit Card</option>
                                        <option value="debit_card">Debit Card</option>
                                        <option value="paypal">PayPal</option>
                                        <option value="stripe">Stripe</option>
                                    </select>
                                    <div class="invalid-feedback">Please select a payment method</div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="order-notes">Order Notes (Optional)</label>
                                    <textarea class="form-control" id="order-notes" rows="2"
                                        placeholder="Special delivery instructions..."></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="hideModal('checkout-modal')">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="cart.placeOrder()">Place Order</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    async placeOrder() {
        if (!validateForm('checkout-form')) return;

        const formData = getFormData('checkout-form');
        const orderData = {
            shipping_address: formData['shipping-address'],
            payment_method: formData['payment-method'],
            notes: formData['order-notes'] || ''
        };

        try {
            const response = await api.createOrder(orderData);
            hideModal('checkout-modal');
            showAlert(`Order placed successfully! Order #${response.order.orderNumber}`, 'success');
            
            // Clear the form
            resetForm('checkout-form');
            
            // Navigate to orders page
            navigateTo('orders');
        } catch (error) {
            showAlert(error.message || 'Failed to place order', 'danger');
        }
    }
}

// Create global cart instance
window.cart = new Cart();
