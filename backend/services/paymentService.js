class PaymentService {
  constructor() {
    console.log('💳 Payment service initialized (mock mode)');
  }
  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    return { clientSecret: 'mock_secret', paymentIntentId: 'mock_pi' };
  }
  async confirmPayment(paymentIntentId) {
    return true;
  }
  async createCustomer(email, name) {
    return 'mock_customer';
  }
  async createCheckoutSession(items, successUrl, cancelUrl) {
    return { id: 'mock_session', url: successUrl };
  }
  async refundPayment(paymentIntentId, amount = null) {
    return { id: 'mock_refund', status: 'succeeded' };
  }
  isValidPaymentMethod(method) {
    return ['credit_card', 'debit_card', 'paypal', 'stripe'].includes(method);
  }
  async processPayment(orderData) {
    return { success: true, transactionId: 'mock_txn' };
  }
}
module.exports = new PaymentService();
