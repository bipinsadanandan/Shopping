class AnalyticsService {
  constructor() {
    this.events = [];
    console.log('📊 Analytics service initialized');
  }
  trackEvent(category, action, label = null, value = null) {
    this.events.push({ category, action, label, value, timestamp: new Date() });
  }
  trackPageView(page, userId = null) {
    this.trackEvent('page_view', page, userId);
  }
  trackPurchase(orderId, total, items) {
    this.trackEvent('purchase', 'completed', orderId, total);
  }
  trackAddToCart(productId, productName, price, quantity) {
    this.trackEvent('add_to_cart', productName, productId, price * quantity);
  }
  trackRemoveFromCart(productId, productName, price, quantity) {
    this.trackEvent('remove_from_cart', productName, productId, price * quantity);
  }
  trackSearch(searchTerm, resultsCount) {
    this.trackEvent('search', searchTerm, null, resultsCount);
  }
  trackUserRegistration(userId) {
    this.trackEvent('user', 'registration', userId);
  }
  trackUserLogin(userId) {
    this.trackEvent('user', 'login', userId);
  }
  getRecentEvents(limit = 100) {
    return this.events.slice(-limit);
  }
  getEventsByCategory(category) {
    return this.events.filter(event => event.category === category);
  }
  generateReport(startDate, endDate) {
    return { totalEvents: this.events.length, eventsByCategory: {}, eventsByAction: {}, totalValue: 0 };
  }
  getDashboardStats() {
    return { eventsToday: 0, eventsThisMonth: 0, totalEvents: this.events.length, recentActivity: [] };
  }
}
module.exports = new AnalyticsService();
