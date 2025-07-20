// WeatherPro Monetization Features
class MonetizationManager {
    constructor() {
        this.freeFeatures = ['current-weather', 'basic-forecast', 'location-search'];
        this.premiumFeatures = ['weather-comparison', 'trends-analytics', 'data-export', 'extended-forecast'];
        this.usageCount = this.getUsageCount();
        this.maxFreeUsage = 10; // Free users get 10 premium feature uses
    }

    checkPremiumAccess(feature) {
        if (this.isPremiumUser()) {
            return true;
        }

        if (this.premiumFeatures.includes(feature)) {
            if (this.usageCount >= this.maxFreeUsage) {
                this.showUpgradeModal(feature);
                return false;
            }
            this.incrementUsage();
        }
        return true;
    }

    showUpgradeModal(feature) {
        const modal = document.createElement('div');
        modal.className = 'upgrade-modal';
        modal.innerHTML = `
            <div class="upgrade-content">
                <div class="upgrade-header">
                    <i class="fas fa-crown"></i>
                    <h3>Upgrade to WeatherPro Premium</h3>
                </div>
                <div class="upgrade-body">
                    <p>Unlock <strong>${this.getFeatureName(feature)}</strong> and all premium features:</p>
                    <ul class="premium-features">
                        <li><i class="fas fa-check"></i> Unlimited city comparisons</li>
                        <li><i class="fas fa-check"></i> Advanced weather trends & analytics</li>
                        <li><i class="fas fa-check"></i> Professional data export (CSV/JSON)</li>
                        <li><i class="fas fa-check"></i> Extended 14-day forecasts</li>
                        <li><i class="fas fa-check"></i> Priority weather alerts</li>
                        <li><i class="fas fa-check"></i> Ad-free experience</li>
                    </ul>
                    <div class="pricing">
                        <div class="price-tag">
                            <span class="currency">$</span>
                            <span class="amount">4.99</span>
                            <span class="period">/month</span>
                        </div>
                        <p class="price-note">Cancel anytime • 7-day free trial</p>
                    </div>
                </div>
                <div class="upgrade-actions">
                    <button class="upgrade-btn premium" onclick="this.startTrial()">
                        <i class="fas fa-rocket"></i> Start Free Trial
                    </button>
                    <button class="upgrade-btn secondary" onclick="this.closeModal()">
                        Maybe Later
                    </button>
                </div>
                <button class="close-modal" onclick="this.closeModal()">×</button>
            </div>
        `;
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('active'), 100);
    }

    getFeatureName(feature) {
        const names = {
            'weather-comparison': 'Weather Comparison',
            'trends-analytics': 'Trends & Analytics',
            'data-export': 'Data Export',
            'extended-forecast': 'Extended Forecasts'
        };
        return names[feature] || 'Premium Feature';
    }

    isPremiumUser() {
        return localStorage.getItem('weatherpro_premium') === 'true';
    }

    getUsageCount() {
        return parseInt(localStorage.getItem('weatherpro_usage') || '0');
    }

    incrementUsage() {
        this.usageCount++;
        localStorage.setItem('weatherpro_usage', this.usageCount.toString());
    }

    startTrial() {
        // Integrate with payment processor (Stripe, PayPal, etc.)
        window.open('https://checkout.stripe.com/your-premium-link', '_blank');
    }

    closeModal() {
        const modal = document.querySelector('.upgrade-modal');
        if (modal) {
            modal.remove();
        }
    }

    // Track feature usage for analytics
    trackFeatureUsage(feature, action = 'used') {
        // Send to analytics (Google Analytics, Mixpanel, etc.)
        if (typeof gtag !== 'undefined') {
            gtag('event', action, {
                event_category: 'feature_usage',
                event_label: feature,
                value: this.isPremiumUser() ? 1 : 0
            });
        }
    }

    // Add usage limits display
    showUsageStatus() {
        if (!this.isPremiumUser()) {
            const remaining = this.maxFreeUsage - this.usageCount;
            if (remaining <= 3) {
                this.showUsageWarning(remaining);
            }
        }
    }

    showUsageWarning(remaining) {
        const warning = document.createElement('div');
        warning.className = 'usage-warning';
        warning.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>Only ${remaining} premium features left today</span>
            <button onclick="monetization.showUpgradeModal('usage-limit')">Upgrade</button>
        `;
        document.querySelector('.header').appendChild(warning);
    }
}

// Initialize monetization
const monetization = new MonetizationManager();
