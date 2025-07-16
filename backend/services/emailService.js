class EmailService {
  constructor() {
    console.log('📧 Email service initialized (mock mode)');
  }
  async sendEmail(to, subject, html) {
    console.log(`📧 Mock email to ${to}: ${subject}`);
    return { messageId: 'mock-' + Date.now() };
  }
  async sendOrderConfirmation(email, username, orderNumber, total, items) {
    return this.sendEmail(email, 'Order Confirmation', 'Mock');
  }
  async sendPasswordReset(email, resetToken) {
    return this.sendEmail(email, 'Password Reset', 'Mock');
  }
  async sendOrderStatusUpdate(email, orderNumber, newStatus) {
    return this.sendEmail(email, 'Status Update', 'Mock');
  }
}
module.exports = new EmailService();
