class Orders {
    constructor() {
        this.currentPage = 1;
        this.statusFilter = '';
    }

    async loadOrders(page = 1) {
        if (!auth.requireAuth()) return;

        this.currentPage = page;
        showLoading('orders-list');

        const params = {
            page: this.currentPage,
            limit: 10
        };

        if (this.statusFilter) {
            params.status = this.statusFilter;
        }

        try {
            const response = await api.getOrders(params);
            this.renderOrders(response.orders);
            this.renderPagination(response.pagination);
        } catch (error) {
            showAlert('Failed to load orders', 'danger');
            console.error('Orders error:', error);
        }
    }

    renderOrders(orders) {
        const container = document.getElementById('orders-list');
        
        if (!orders || orders.length === 0) {
            container.innerHTML = `
                <div class="text-center p-5">
                    <h3>No orders found</h3>
                    <p class="text-muted">You haven't placed any orders yet</p>
                    <button class="btn btn-primary" onclick="navigateTo('products')">Start Shopping</button>
                </div>
            `;
            return;
        }

        let html = '<div class="orders-container">';
        
        orders.forEach(order => {
            const statusClass = {
                pending: 'warning',
                processing: 'info',
                shipped: 'primary',
                delivered: 'success',
                cancelled: 'danger'
            }[order.status] || 'secondary';

            html += `
                <div class="card mb-3">
                    <div class="card-header">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h5 class="mb-0">Order #${order.order_number || order.id}</h5>
                                <small class="text-muted">Placed on ${formatDate(order.created_at)}</small>
                            </div>
                            <div>
                                <span class="badge badge-${statusClass}">${order.status.toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-8">
                                <p><strong>Items:</strong> ${order.itemCount} items (${order.totalQuantity} total quantity)</p>
                                <p><strong>Shipping:</strong> ${order.shipping_address}</p>
                                <p><strong>Payment:</strong> ${order.payment_method.replace('_', ' ')}</p>
                            </div>
                            <div class="col-md-4 text-right">
                                <h4>Total: ${order.total_amount}</h4>
                                <button class="btn btn-sm btn-outline-primary" 
                                        onclick="orders.viewOrderDetails(${order.id})">
                                    View Details
                                </button>
                                ${['pending', 'processing'].includes(order.status) ? `
                                    <button class="btn btn-sm btn-outline-danger" 
                                            onclick="orders.cancelOrder(${order.id})">
                                        Cancel Order
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    renderPagination(pagination) {
        createPagination('orders-pagination', pagination.page, pagination.totalPages, 'orders.loadOrders');
    }

    filterByStatus(status) {
        this.statusFilter = status;
        this.loadOrders(1);
    }

    async viewOrderDetails(orderId) {
        try {
            const response = await api.getOrder(orderId);
            const order = response.order;

            const modalHtml = `
                <div id="order-details-modal" class="modal show">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Order Details #${order.order_number || order.id}</h5>
                                <button type="button" class="close" onclick="hideModal('order-details-modal')">
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <strong>Status:</strong> 
                                    <span class="badge badge-${this.getStatusClass(order.status)}">
                                        ${order.status.toUpperCase()}
                                    </span>
                                </div>
                                
                                <div class="mb-3">
                                    <strong>Order Date:</strong> ${formatDate(order.created_at)}
                                </div>
                                
                                <div class="mb-3">
                                    <strong>Shipping Address:</strong><br>
                                    ${order.shipping_address}
                                </div>
                                
                                <h6>Order Items:</h6>
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Price</th>
                                            <th>Quantity</th>
                                            <th class="text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${order.items.map(item => `
                                            <tr>
                                                <td>${item.name}</td>
                                                <td>${item.price_at_time}</td>
                                                <td>${item.quantity}</td>
                                                <td class="text-right">${item.subtotal}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colspan="3" class="text-right"><strong>Subtotal:</strong></td>
                                            <td class="text-right">${order.subtotal}</td>
                                        </tr>
                                        <tr>
                                            <td colspan="3" class="text-right"><strong>Tax:</strong></td>
                                            <td class="text-right">${order.tax}</td>
                                        </tr>
                                        <tr>
                                            <td colspan="3" class="text-right"><strong>Total:</strong></td>
                                            <td class="text-right"><strong>${order.total_amount}</strong></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" onclick="hideModal('order-details-modal')">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } catch (error) {
            showAlert('Failed to load order details', 'danger');
        }
    }

    async cancelOrder(orderId) {
        if (!confirm('Are you sure you want to cancel this order?')) return;

        try {
            await api.cancelOrder(orderId);
            showAlert('Order cancelled successfully', 'success');
            this.loadOrders(this.currentPage);
        } catch (error) {
            showAlert(error.message || 'Failed to cancel order', 'danger');
        }
    }

    getStatusClass(status) {
        const classes = {
            pending: 'warning',
            processing: 'info',
            shipped: 'primary',
            delivered: 'success',
            cancelled: 'danger'
        };
        return classes[status] || 'secondary';
    }
}

// Create global orders instance
window.orders = new Orders();

// Search functionality
let searchTimeout;
function handleSearch(event) {
    clearTimeout(searchTimeout);
    const query = event.target.value;
    
    searchTimeout = setTimeout(() => {
        if (query.length >= 2 || query.length === 0) {
            products.searchProducts(query);
        }
    }, 300);
}

// Profile functionality
async function loadProfile() {
    if (!auth.requireAuth()) return;

    showLoading('profile-content');

    try {
        const { user } = await api.getProfile();
        
        const container = document.getElementById('profile-content');
        container.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h3>Profile Information</h3>
                    <form id="profile-form">
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" class="form-control" value="${user.email}" readonly>
                        </div>
                        
                        <div class="form-group">
                            <label for="profile-username">Username</label>
                            <input type="text" class="form-control" id="profile-username" 
                                   value="${user.username}" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Account Type</label>
                            <input type="text" class="form-control" 
                                   value="${user.role.charAt(0).toUpperCase() + user.role.slice(1)}" readonly>
                        </div>
                        
                        <div class="form-group">
                            <label>Member Since</label>
                            <input type="text" class="form-control" 
                                   value="${formatDate(user.created_at)}" readonly>
                        </div>
                        
                        <button type="button" class="btn btn-primary" onclick="updateProfile()">
                            Update Profile
                        </button>
                    </form>
                </div>
            </div>
        `;
    } catch (error) {
        showAlert('Failed to load profile', 'danger');
    }
}

async function updateProfile() {
    if (!validateForm('profile-form')) return;

    const username = document.getElementById('profile-username').value;

    try {
        await api.updateProfile({ username });
        showAlert('Profile updated successfully', 'success');
        auth.user.username = username;
        auth.updateUI();
    } catch (error) {
        showAlert(error.message || 'Failed to update profile', 'danger');
    }
}