// Weather App JavaScript
class WeatherApp {
    constructor() {
        this.apiKey = '90a540a94859c8b2779ff800e08bea92'; // Replace with your OpenWeatherMap API key
        this.currentUnit = 'celsius';
        this.currentLocation = { lat: 40.7128, lon: -74.0060 }; // Default to New York
        this.radarMap = null;
        this.weatherLayers = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDateTime();
        this.loadCurrentLocationWeather(); // Load current location instead of default
        setInterval(() => this.updateDateTime(), 60000); // Update every minute
    }

    setupEventListeners() {
        // Search functionality
        const searchBtn = document.getElementById('searchBtn');
        const locationInput = document.getElementById('locationInput');
        const locationBtn = document.getElementById('locationBtn');

        searchBtn.addEventListener('click', () => this.searchLocation());
        locationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchLocation();
        });
        locationBtn.addEventListener('click', () => this.getCurrentLocation());

        // Temperature unit toggle
        document.getElementById('celsiusBtn').addEventListener('click', () => this.setUnit('celsius'));
        document.getElementById('fahrenheitBtn').addEventListener('click', () => this.setUnit('fahrenheit'));

        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Radar controls
        document.querySelectorAll('.radar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchRadarLayer(e.target.dataset.layer));
        });

        // Weather comparison controls
        const addCompareBtn = document.getElementById('addCompareBtn');
        const compareInput = document.getElementById('compareInput');
        
        if (addCompareBtn && compareInput) {
            addCompareBtn.addEventListener('click', () => this.addCityComparison());
            compareInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addCityComparison();
            });
        }

        // Trends controls
        document.querySelectorAll('.trend-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTrend(e.target.dataset.trend));
        });

        // Export controls
        const exportJSONBtn = document.getElementById('exportJSON');
        const exportCSVBtn = document.getElementById('exportCSV');
        
        if (exportJSONBtn) exportJSONBtn.addEventListener('click', () => this.exportData('json'));
        if (exportCSVBtn) exportCSVBtn.addEventListener('click', () => this.exportData('csv'));
    }

    updateDateTime() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);
    }

    async loadCurrentLocationWeather() {
        this.showLoading(true);
        
        // Show location request message
        this.showLocationRequest();
        
        // Try to get user's current location first
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    this.currentLocation = { lat, lon };
                    
                    try {
                        await this.getWeatherData(lat, lon);
                        const locationName = await this.reverseGeocode(lat, lon);
                        document.getElementById('currentLocation').textContent = locationName;
                        console.log('✅ Loaded weather for current location:', locationName);
                    } catch (error) {
                        console.error('Error getting current location weather:', error);
                        this.loadDefaultWeather(); // Fallback to default
                    }
                    this.showLoading(false);
                },
                (error) => {
                    console.warn('Geolocation denied or failed:', error.message);
                    console.log('📍 Falling back to default location (New York)');
                    this.loadDefaultWeather(); // Fallback to default
                },
                {
                    timeout: 10000, // 10 second timeout
                    enableHighAccuracy: true,
                    maximumAge: 300000 // 5 minutes cache
                }
            );
        } else {
            console.warn('Geolocation not supported by this browser');
            this.loadDefaultWeather(); // Fallback to default
        }
    }

    async loadDefaultWeather() {
        this.showLoading(true);
        try {
            await this.getWeatherData(this.currentLocation.lat, this.currentLocation.lon);
            console.log('📍 Loaded default weather for New York');
        } catch (error) {
            console.error('Error loading default weather:', error);
            this.showError('Failed to load weather data. Please check your internet connection.');
        }
        this.showLoading(false);
    }

    async searchLocation() {
        const query = document.getElementById('locationInput').value.trim();
        if (!query) return;

        this.showLoading(true);
        try {
            const geoData = await this.geocodeLocation(query);
            if (geoData.length > 0) {
                const location = geoData[0];
                this.currentLocation = { lat: location.lat, lon: location.lon };
                await this.getWeatherData(location.lat, location.lon);
                document.getElementById('currentLocation').textContent = `${location.name}, ${location.country}`;
            } else {
                this.showError('Location not found. Please try a different search term.');
            }
        } catch (error) {
            console.error('Error searching location:', error);
            this.showError('Failed to search location. Please try again.');
        }
        this.showLoading(false);
    }

    async getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by this browser.');
            return;
        }

        this.showLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                this.currentLocation = { lat, lon };
                
                try {
                    await this.getWeatherData(lat, lon);
                    const locationName = await this.reverseGeocode(lat, lon);
                    document.getElementById('currentLocation').textContent = locationName;
                } catch (error) {
                    console.error('Error getting current location weather:', error);
                    this.showError('Failed to get weather for current location.');
                }
                this.showLoading(false);
            },
            (error) => {
                console.error('Geolocation error:', error);
                this.showError('Unable to get your location. Please search manually.');
                this.showLoading(false);
            }
        );
    }

    async geocodeLocation(query) {
        const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${this.apiKey}`
        );
        return await response.json();
    }

    async reverseGeocode(lat, lon) {
        try {
            const response = await fetch(
                `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${this.apiKey}`
            );
            const data = await response.json();
            if (data.length > 0) {
                return `${data[0].name}, ${data[0].country}`;
            }
        } catch (error) {
            console.error('Reverse geocoding error:', error);
        }
        return 'Current Location';
    }

    async getWeatherData(lat, lon) {
        try {
            // Current weather
            const currentResponse = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
            );
            const currentData = await currentResponse.json();

            // Forecast data
            const forecastResponse = await fetch(
                `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
            );
            const forecastData = await forecastResponse.json();

            // Air quality data
            const airQualityResponse = await fetch(
                `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${this.apiKey}`
            );
            const airQualityData = await airQualityResponse.json();

            this.updateCurrentWeather(currentData);
            this.updateHourlyForecast(forecastData);
            this.updateDailyForecast(forecastData);
            this.updateAirQuality(airQualityData);
            this.updateSunMoon(currentData);
            this.updateSmartRecommendations(currentData);
            
            // Fetch weather alerts
            await this.updateWeatherAlerts(lat, lon);

        } catch (error) {
            console.error('Error fetching weather data:', error);
            throw error;
        }
    }

    updateCurrentWeather(data) {
        const temp = Math.round(data.main.temp);
        const feelsLike = Math.round(data.main.feels_like);
        
        document.getElementById('currentTemp').textContent = `${temp}°`;
        document.getElementById('feelsLike').textContent = `Feels like ${feelsLike}°`;
        document.getElementById('weatherDesc').textContent = this.capitalizeWords(data.weather[0].description);
        
        // Update weather icon
        const iconCode = data.weather[0].icon;
        const iconElement = document.getElementById('weatherIcon');
        iconElement.className = this.getWeatherIcon(iconCode);
        
        // Update details
        document.getElementById('visibility').textContent = `${(data.visibility / 1000).toFixed(1)} km`;
        document.getElementById('humidity').textContent = `${data.main.humidity}%`;
        document.getElementById('windSpeed').textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;
        document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;
        document.getElementById('uvIndex').textContent = '5'; // UV index not available in free tier
        document.getElementById('precipitation').textContent = data.rain ? `${Math.round(data.rain['1h'] || 0)}mm` : '0mm';
    }

    updateHourlyForecast(data) {
        const hourlyContainer = document.getElementById('hourlyForecast');
        hourlyContainer.innerHTML = '';
        
        // Take first 24 hours (8 items * 3 hours each = 24 hours)
        const hourlyData = data.list.slice(0, 8);
        
        hourlyData.forEach(item => {
            const time = new Date(item.dt * 1000);
            const hourlyItem = document.createElement('div');
            hourlyItem.className = 'hourly-item';
            
            hourlyItem.innerHTML = `
                <div class="hourly-time">${time.getHours()}:00</div>
                <div class="hourly-icon">
                    <i class="${this.getWeatherIcon(item.weather[0].icon)}"></i>
                </div>
                <div class="hourly-temp">${Math.round(item.main.temp)}°</div>
                <div class="hourly-desc">${item.weather[0].main}</div>
            `;
            
            hourlyContainer.appendChild(hourlyItem);
        });
    }

    updateDailyForecast(data) {
        const dailyContainer = document.getElementById('dailyForecast');
        dailyContainer.innerHTML = '';
        
        // Group forecast data by day
        const dailyData = this.groupForecastByDay(data.list);
        
        dailyData.slice(0, 7).forEach(day => {
            const date = new Date(day.dt * 1000);
            const dailyItem = document.createElement('div');
            dailyItem.className = 'daily-item';
            
            dailyItem.innerHTML = `
                <div class="daily-date">
                    <div class="daily-day">${date.toLocaleDateString('en-US', { weekday: 'long' })}</div>
                    <div class="daily-date-num">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                </div>
                <div class="daily-weather">
                    <div class="daily-icon">
                        <i class="${this.getWeatherIcon(day.weather[0].icon)}"></i>
                    </div>
                    <div class="daily-desc">${day.weather[0].main}</div>
                </div>
                <div class="daily-temps">
                    <span class="daily-high">${Math.round(day.main.temp_max)}°</span>
                    <span class="daily-low">${Math.round(day.main.temp_min)}°</span>
                </div>
                <div class="daily-precip">
                    <i class="fas fa-droplet"></i>
                    <span>${Math.round((day.pop || 0) * 100)}%</span>
                </div>
            `;
            
            dailyContainer.appendChild(dailyItem);
        });
    }

    updateAirQuality(data) {
        if (data.list && data.list.length > 0) {
            const aqi = data.list[0].main.aqi;
            const components = data.list[0].components;
            
            document.getElementById('aqiNumber').textContent = aqi * 20; // Scale to 0-100
            document.getElementById('aqiLabel').textContent = this.getAQILabel(aqi);
            document.getElementById('aqiLabel').className = `aqi-label ${this.getAQIClass(aqi)}`;
            
            // Update AQI progress bar
            const progress = document.getElementById('aqiProgress');
            progress.style.width = `${(aqi * 20)}%`;
            
            // Update pollutants
            document.getElementById('pm25').textContent = `${Math.round(components.pm2_5)} μg/m³`;
            document.getElementById('pm10').textContent = `${Math.round(components.pm10)} μg/m³`;
            document.getElementById('o3').textContent = `${Math.round(components.o3)} μg/m³`;
            document.getElementById('no2').textContent = `${Math.round(components.no2)} μg/m³`;
        }
    }

    updateSunMoon(data) {
        const sunrise = new Date(data.sys.sunrise * 1000);
        const sunset = new Date(data.sys.sunset * 1000);
        
        document.getElementById('sunrise').textContent = sunrise.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
        });
        document.getElementById('sunset').textContent = sunset.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
        });
    }

    async updateWeatherAlerts(lat, lon) {
        try {
            // OpenWeatherMap One Call API for alerts (requires subscription)
            // For free tier, we'll simulate alerts based on weather conditions
            const alertsContainer = document.getElementById('alertsContainer');
            
            // Get current weather to check for severe conditions
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
            );
            const weatherData = await response.json();
            
            const alerts = this.generateAlertsFromWeather(weatherData);
            
            if (alerts.length === 0) {
                // No alerts - show safe message
                alertsContainer.innerHTML = `
                    <div class="no-alerts">
                        <i class="fas fa-shield-check"></i>
                        <p>No active weather alerts for your area</p>
                        <small>Weather conditions are currently safe</small>
                    </div>
                `;
            } else {
                // Display alerts
                alertsContainer.innerHTML = alerts.map(alert => `
                    <div class="alert-item ${alert.severity}">
                        <div class="alert-header">
                            <i class="${alert.icon}"></i>
                            <span class="alert-title">${alert.title}</span>
                            <span class="alert-time">${alert.time}</span>
                        </div>
                        <div class="alert-description">${alert.description}</div>
                        ${alert.instructions ? `<div class="alert-instructions">${alert.instructions}</div>` : ''}
                    </div>
                `).join('');
            }
            
        } catch (error) {
            console.error('Error fetching weather alerts:', error);
            document.getElementById('alertsContainer').innerHTML = `
                <div class="alert-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Unable to load weather alerts</p>
                    <small>Please check your internet connection</small>
                </div>
            `;
        }
    }

    generateAlertsFromWeather(weatherData) {
        const alerts = [];
        const weather = weatherData.weather[0];
        const main = weatherData.main;
        const wind = weatherData.wind;
        
        // For demonstration purposes, let's add some sample alerts
        // Remove this section in production
        if (Math.random() > 0.7) { // 30% chance to show demo alerts
            alerts.push({
                title: 'Demo: Weather Advisory',
                description: 'This is a demonstration alert to show how weather warnings appear.',
                severity: 'moderate',
                icon: 'fas fa-info-circle',
                time: 'Demo Mode',
                instructions: 'This is a test alert. Your actual weather conditions are safe.'
            });
        }
        
        // Check for severe weather conditions
        
        // Thunderstorm alerts
        if (weather.id >= 200 && weather.id < 300) {
            alerts.push({
                title: 'Thunderstorm Warning',
                description: `Thunderstorms are currently affecting your area. ${weather.description}.`,
                severity: 'severe',
                icon: 'fas fa-bolt',
                time: 'Active Now',
                instructions: 'Stay indoors and avoid outdoor activities. Unplug electronic devices.'
            });
        }
        
        // Heavy rain alerts
        if (weather.id >= 500 && weather.id < 600 && (weather.id === 502 || weather.id === 503 || weather.id === 504)) {
            alerts.push({
                title: 'Heavy Rain Advisory',
                description: `Heavy rainfall is occurring in your area. ${weather.description}.`,
                severity: 'moderate',
                icon: 'fas fa-cloud-rain',
                time: 'Active Now',
                instructions: 'Avoid driving through flooded roads. Stay alert for flash flooding.'
            });
        }
        
        // Snow alerts
        if (weather.id >= 600 && weather.id < 700) {
            alerts.push({
                title: 'Winter Weather Advisory',
                description: `Snow conditions are affecting your area. ${weather.description}.`,
                severity: 'moderate',
                icon: 'fas fa-snowflake',
                time: 'Active Now',
                instructions: 'Drive carefully and allow extra time for travel. Dress warmly.'
            });
        }
        
        // High wind alerts
        if (wind && wind.speed > 5) { // 5 m/s = ~18 km/h (lowered for demo)
            alerts.push({
                title: 'High Wind Advisory',
                description: `Strong winds of ${Math.round(wind.speed * 3.6)} km/h are affecting your area.`,
                severity: 'moderate',
                icon: 'fas fa-wind',
                time: 'Active Now',
                instructions: 'Secure loose objects outdoors. Be cautious when driving high-profile vehicles.'
            });
        }
        
        // Extreme temperature alerts
        if (main.temp > 25) { // Lowered from 35 for demo
            alerts.push({
                title: 'Heat Warning',
                description: `Extreme heat conditions with temperatures reaching ${Math.round(main.temp)}°C.`,
                severity: 'severe',
                icon: 'fas fa-temperature-high',
                time: 'Active Now',
                instructions: 'Stay hydrated, avoid prolonged sun exposure, and check on elderly neighbors.'
            });
        }
        
        if (main.temp < -10) {
            alerts.push({
                title: 'Extreme Cold Warning',
                description: `Dangerously cold temperatures of ${Math.round(main.temp)}°C.`,
                severity: 'severe',
                icon: 'fas fa-temperature-low',
                time: 'Active Now',
                instructions: 'Dress in layers, limit time outdoors, and protect exposed skin.'
            });
        }
        
        // Fog/visibility alerts
        if (weather.id >= 700 && weather.id < 800 && weatherData.visibility < 1000) {
            alerts.push({
                title: 'Dense Fog Advisory',
                description: `Poor visibility conditions with visibility reduced to ${weatherData.visibility}m.`,
                severity: 'moderate',
                icon: 'fas fa-smog',
                time: 'Active Now',
                instructions: 'Drive slowly with headlights on. Use fog lights if available.'
            });
        }
        
        return alerts;
    }

    groupForecastByDay(forecastList) {
        const grouped = {};
        
        forecastList.forEach(item => {
            const date = new Date(item.dt * 1000).toDateString();
            if (!grouped[date]) {
                grouped[date] = {
                    ...item,
                    main: {
                        ...item.main,
                        temp_max: item.main.temp_max,
                        temp_min: item.main.temp_min
                    }
                };
            } else {
                grouped[date].main.temp_max = Math.max(grouped[date].main.temp_max, item.main.temp_max);
                grouped[date].main.temp_min = Math.min(grouped[date].main.temp_min, item.main.temp_min);
            }
        });
        
        return Object.values(grouped);
    }

    getWeatherIcon(iconCode) {
        const iconMap = {
            '01d': 'fas fa-sun',
            '01n': 'fas fa-moon',
            '02d': 'fas fa-cloud-sun',
            '02n': 'fas fa-cloud-moon',
            '03d': 'fas fa-cloud',
            '03n': 'fas fa-cloud',
            '04d': 'fas fa-clouds',
            '04n': 'fas fa-clouds',
            '09d': 'fas fa-cloud-rain',
            '09n': 'fas fa-cloud-rain',
            '10d': 'fas fa-cloud-sun-rain',
            '10n': 'fas fa-cloud-moon-rain',
            '11d': 'fas fa-bolt',
            '11n': 'fas fa-bolt',
            '13d': 'fas fa-snowflake',
            '13n': 'fas fa-snowflake',
            '50d': 'fas fa-smog',
            '50n': 'fas fa-smog'
        };
        
        return iconMap[iconCode] || 'fas fa-sun';
    }

    getAQILabel(aqi) {
        const labels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
        return labels[aqi - 1] || 'Unknown';
    }

    getAQIClass(aqi) {
        const classes = ['good', 'fair', 'moderate', 'poor', 'very-poor'];
        return classes[aqi - 1] || 'unknown';
    }

    setUnit(unit) {
        this.currentUnit = unit;
        
        // Update button states
        document.getElementById('celsiusBtn').classList.toggle('active', unit === 'celsius');
        document.getElementById('fahrenheitBtn').classList.toggle('active', unit === 'fahrenheit');
        
        // Reload weather data with new unit
        this.loadDefaultWeather();
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === tabName);
        });
        
        // Load specific data if needed
        if (tabName === 'radar') {
            this.loadRadarData();
        }
    }

    switchRadarLayer(layer) {
        // Update radar button states
        document.querySelectorAll('.radar-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.layer === layer);
        });
        
        // Switch weather layer on map
        if (this.radarMap && this.weatherLayers[layer]) {
            // Remove all layers first
            Object.values(this.weatherLayers).forEach(weatherLayer => {
                if (this.radarMap.hasLayer(weatherLayer)) {
                    this.radarMap.removeLayer(weatherLayer);
                }
            });
            
            // Add selected layer
            this.radarMap.addLayer(this.weatherLayers[layer]);
        }
    }

    loadRadarData() {
        // Initialize radar map if not already done
        if (!this.radarMap) {
            this.initializeRadarMap();
        }
        
        // Update map center to current location
        if (this.radarMap) {
            this.radarMap.setView([this.currentLocation.lat, this.currentLocation.lon], 8);
        }
    }

    initializeRadarMap() {
        try {
            // Create the map
            this.radarMap = L.map('radarMap').setView([this.currentLocation.lat, this.currentLocation.lon], 8);
            
            // Add base tile layer (OpenStreetMap)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18
            }).addTo(this.radarMap);
            
            // Create weather layers
            this.weatherLayers = {
                precipitation: L.tileLayer(
                    `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${this.apiKey}`,
                    {
                        attribution: '© OpenWeatherMap',
                        opacity: 0.6,
                        maxZoom: 18
                    }
                ),
                clouds: L.tileLayer(
                    `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${this.apiKey}`,
                    {
                        attribution: '© OpenWeatherMap',
                        opacity: 0.6,
                        maxZoom: 18
                    }
                ),
                temperature: L.tileLayer(
                    `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${this.apiKey}`,
                    {
                        attribution: '© OpenWeatherMap',
                        opacity: 0.6,
                        maxZoom: 18
                    }
                ),
                wind: L.tileLayer(
                    `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${this.apiKey}`,
                    {
                        attribution: '© OpenWeatherMap',
                        opacity: 0.6,
                        maxZoom: 18
                    }
                )
            };
            
            // Add default layer (precipitation)
            this.radarMap.addLayer(this.weatherLayers.precipitation);
            
            // Add location marker
            L.marker([this.currentLocation.lat, this.currentLocation.lon])
                .addTo(this.radarMap)
                .bindPopup('Current Location')
                .openPopup();
            
            console.log('Radar map initialized successfully!');
            
        } catch (error) {
            console.error('Error initializing radar map:', error);
            // Show fallback message
            document.getElementById('radarMap').innerHTML = `
                <div class="radar-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Unable to load radar map</p>
                    <small>Please check your internet connection</small>
                </div>
            `;
        }
    }

    capitalizeWords(str) {
        return str.replace(/\b\w/g, l => l.toUpperCase());
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.toggle('active', show);
    }

    showError(message) {
        // Create a simple error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fee;
            color: #c53030;
            padding: 15px 20px;
            border-radius: 8px;
            border: 1px solid #feb2b2;
            z-index: 1001;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        `;
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    showLocationRequest() {
        // Create a friendly location request notification
        const locationDiv = document.createElement('div');
        locationDiv.className = 'location-request';
        locationDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            padding: 15px 25px;
            border-radius: 12px;
            z-index: 1001;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 8px 25px rgba(0,0,0,0.2);
            backdrop-filter: blur(10px);
        `;
        locationDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; justify-content: center;">
                <i class="fas fa-location-dot" style="font-size: 1.2rem;"></i>
                <span>Requesting your location for accurate weather...</span>
            </div>
            <small style="display: block; margin-top: 5px; opacity: 0.9;">Please allow location access for the best experience</small>
        `;
        
        document.body.appendChild(locationDiv);
        
        // Remove after 8 seconds
        setTimeout(() => {
            if (locationDiv.parentNode) {
                locationDiv.remove();
            }
        }, 8000);
    }

    // Weather Comparison Methods
    async addCityComparison() {
        const input = document.getElementById('compareInput');
        const query = input.value.trim();
        
        if (!query) {
            this.showError('Please enter a city name to compare');
            return;
        }

        this.showLoading(true);
        try {
            const geoData = await this.geocodeLocation(query);
            if (geoData.length > 0) {
                const location = geoData[0];
                await this.addComparisonCity(location);
                input.value = ''; // Clear input
            } else {
                this.showError('City not found. Please try a different name.');
            }
        } catch (error) {
            console.error('Error adding comparison city:', error);
            this.showError('Failed to add city for comparison.');
        }
        this.showLoading(false);
    }

    async addComparisonCity(location) {
        try {
            // Get weather data for the city
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${this.apiKey}&units=metric`
            );
            const weatherData = await response.json();

            // Create comparison item
            const container = document.getElementById('comparisonContainer');
            
            // Remove placeholder if it exists
            const placeholder = container.querySelector('.comparison-placeholder');
            if (placeholder) {
                placeholder.remove();
            }

            // Create or get comparison grid
            let grid = container.querySelector('.comparison-grid');
            if (!grid) {
                grid = document.createElement('div');
                grid.className = 'comparison-grid';
                container.appendChild(grid);
            }

            // Create comparison item
            const compareItem = document.createElement('div');
            compareItem.className = 'compare-item';
            compareItem.innerHTML = `
                <button class="compare-remove" onclick="this.parentElement.remove(); this.checkEmptyComparison();">
                    <i class="fas fa-times"></i>
                </button>
                <div class="compare-header">
                    <h4>${location.name}, ${location.country}</h4>
                    <div class="compare-temp">${Math.round(weatherData.main.temp)}°C</div>
                </div>
                <div class="compare-details">
                    <div class="compare-detail">
                        <i class="${this.getWeatherIcon(weatherData.weather[0].icon)}"></i>
                        <span>${weatherData.weather[0].description}</span>
                    </div>
                    <div class="compare-detail">
                        <i class="fas fa-tint"></i>
                        <span>${weatherData.main.humidity}% humidity</span>
                    </div>
                    <div class="compare-detail">
                        <i class="fas fa-wind"></i>
                        <span>${Math.round(weatherData.wind.speed * 3.6)} km/h wind</span>
                    </div>
                    <div class="compare-detail">
                        <i class="fas fa-thermometer-half"></i>
                        <span>Feels like ${Math.round(weatherData.main.feels_like)}°C</span>
                    </div>
                </div>
            `;

            grid.appendChild(compareItem);
            console.log(`✅ Added ${location.name} to comparison`);

        } catch (error) {
            console.error('Error fetching comparison city weather:', error);
            throw error;
        }
    }

    checkEmptyComparison() {
        const container = document.getElementById('comparisonContainer');
        const grid = container.querySelector('.comparison-grid');
        
        if (!grid || grid.children.length === 0) {
            container.innerHTML = `
                <div class="comparison-placeholder">
                    <i class="fas fa-balance-scale"></i>
                    <p>Add cities to compare weather conditions</p>
                    <small>Perfect for travel planning and decision making</small>
                </div>
            `;
        }
    }

    // Weather Trends Methods
    switchTrend(trendType) {
        // Update trend button states
        document.querySelectorAll('.trend-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.trend === trendType);
        });

        // Update trend display
        this.updateTrendDisplay(trendType);
    }

    updateTrendDisplay(trendType) {
        const chartContainer = document.getElementById('trendChart');
        const insightsContainer = document.getElementById('trendInsights');

        // Simulate trend data based on type
        const trendData = this.generateTrendData(trendType);

        // Update chart placeholder
        chartContainer.innerHTML = `
            <div class="chart-placeholder">
                <i class="fas fa-chart-line"></i>
                <p>${this.capitalizeWords(trendType)} trends and patterns</p>
                <small>Showing ${trendType} data over time</small>
            </div>
        `;

        // Update insights
        insightsContainer.innerHTML = trendData.insights.map(insight => `
            <div class="insight-item">
                <span class="insight-label">${insight.label}</span>
                <span class="insight-value ${insight.trend || ''}">${insight.value}</span>
            </div>
        `).join('');
    }

    generateTrendData(trendType) {
        const trendMap = {
            temperature: {
                insights: [
                    { label: 'Today vs Yesterday', value: '+3°C warmer', trend: 'trend-up' },
                    { label: 'Weekly Average', value: '24°C' },
                    { label: 'Trend Direction', value: '↗ Rising', trend: 'trend-up' }
                ]
            },
            humidity: {
                insights: [
                    { label: 'Current Level', value: '65%' },
                    { label: 'Daily Average', value: '58%' },
                    { label: 'Trend Direction', value: '↘ Falling', trend: 'trend-down' }
                ]
            },
            pressure: {
                insights: [
                    { label: 'Current Pressure', value: '1013 hPa' },
                    { label: 'Change (24h)', value: '+5 hPa', trend: 'trend-up' },
                    { label: 'Stability', value: 'Stable' }
                ]
            },
            wind: {
                insights: [
                    { label: 'Current Speed', value: '15 km/h' },
                    { label: 'Gusts', value: '22 km/h' },
                    { label: 'Direction', value: 'NW' }
                ]
            }
        };

        return trendMap[trendType] || trendMap.temperature;
    }

    // Export Data Methods
    exportData(format) {
        const weatherData = {
            location: document.getElementById('currentLocation').textContent,
            timestamp: new Date().toISOString(),
            current: {
                temperature: document.getElementById('currentTemp').textContent,
                description: document.getElementById('weatherDesc').textContent,
                feelsLike: document.getElementById('feelsLike').textContent,
                humidity: document.getElementById('humidity').textContent,
                windSpeed: document.getElementById('windSpeed').textContent,
                pressure: document.getElementById('pressure').textContent,
                visibility: document.getElementById('visibility').textContent,
                uvIndex: document.getElementById('uvIndex').textContent
            },
            forecast: this.getForecastData(),
            airQuality: {
                aqi: document.getElementById('aqiNumber').textContent,
                pm25: document.getElementById('pm25').textContent,
                pm10: document.getElementById('pm10').textContent
            }
        };

        if (format === 'json') {
            this.downloadJSON(weatherData);
        } else if (format === 'csv') {
            this.downloadCSV(weatherData);
        }
    }

    downloadJSON(data) {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `weather-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showSuccess('Weather data exported as JSON!');
    }

    downloadCSV(data) {
        const csvRows = [
            ['Property', 'Value'],
            ['Location', data.location],
            ['Timestamp', data.timestamp],
            ['Temperature', data.current.temperature],
            ['Description', data.current.description],
            ['Feels Like', data.current.feelsLike],
            ['Humidity', data.current.humidity],
            ['Wind Speed', data.current.windSpeed],
            ['Pressure', data.current.pressure],
            ['Visibility', data.current.visibility],
            ['UV Index', data.current.uvIndex],
            ['AQI', data.airQuality.aqi],
            ['PM2.5', data.airQuality.pm25],
            ['PM10', data.airQuality.pm10]
        ];

        const csvString = csvRows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `weather-data-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showSuccess('Weather data exported as CSV!');
    }

    getForecastData() {
        // Get forecast data from DOM (simplified)
        const hourlyItems = document.querySelectorAll('.hourly-item');
        const dailyItems = document.querySelectorAll('.daily-item');
        
        return {
            hourly: Array.from(hourlyItems).map(item => ({
                time: item.querySelector('.hourly-time')?.textContent,
                temp: item.querySelector('.hourly-temp')?.textContent,
                desc: item.querySelector('.hourly-desc')?.textContent
            })),
            daily: Array.from(dailyItems).map(item => ({
                day: item.querySelector('.daily-day')?.textContent,
                high: item.querySelector('.daily-high')?.textContent,
                low: item.querySelector('.daily-low')?.textContent
            }))
        };
    }

    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-notification';
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #d1fae5;
            color: #065f46;
            padding: 15px 20px;
            border-radius: 8px;
            border: 1px solid #10b981;
            z-index: 1001;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        `;
        successDiv.textContent = message;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    // Update smart recommendations
    updateSmartRecommendations(weatherData) {
        const recommendations = [];
        const temp = weatherData.main.temp;
        const weather = weatherData.weather[0];
        const humidity = weatherData.main.humidity;
        const windSpeed = weatherData.wind?.speed || 0;

        // Temperature-based recommendations
        if (temp > 25) {
            recommendations.push({ icon: 'fas fa-tshirt', text: 'Light clothing recommended' });
            recommendations.push({ icon: 'fas fa-sun', text: 'Apply sunscreen before going out' });
        } else if (temp < 10) {
            recommendations.push({ icon: 'fas fa-jacket', text: 'Wear warm clothing' });
            recommendations.push({ icon: 'fas fa-gloves', text: 'Consider gloves and hat' });
        }

        // Weather condition recommendations
        if (weather.id >= 200 && weather.id < 600) {
            recommendations.push({ icon: 'fas fa-umbrella', text: 'Carry an umbrella today' });
            recommendations.push({ icon: 'fas fa-home', text: 'Consider indoor activities' });
        }

        // Humidity recommendations
        if (humidity > 80) {
            recommendations.push({ icon: 'fas fa-droplet', text: 'High humidity - stay hydrated' });
        }

        // Wind recommendations
        if (windSpeed > 8) {
            recommendations.push({ icon: 'fas fa-wind', text: 'Secure loose items outdoors' });
        }

        // Default recommendations
        if (recommendations.length === 0) {
            recommendations.push({ icon: 'fas fa-check', text: 'Great weather for outdoor activities' });
            recommendations.push({ icon: 'fas fa-walking', text: 'Perfect day for a walk' });
        }

        // Update recommendations display
        const container = document.getElementById('smartRecommendations');
        if (container) {
            container.innerHTML = recommendations.slice(0, 3).map(rec => `
                <div class="recommendation-item">
                    <i class="${rec.icon}"></i>
                    <span>${rec.text}</span>
                </div>
            `).join('');
        }
    }
}

// Sample data for demonstration (when API key is not available)
const sampleWeatherData = {
    current: {
        location: "New York, NY",
        temperature: 22,
        feelsLike: 25,
        description: "Partly Cloudy",
        icon: "02d",
        visibility: 10,
        humidity: 65,
        windSpeed: 15,
        pressure: 1013,
        uvIndex: 5,
        precipitation: 0,
        sunrise: "06:30",
        sunset: "19:45"
    },
    hourly: [
        { time: "14:00", icon: "02d", temp: 22, desc: "Partly Cloudy" },
        { time: "15:00", icon: "02d", temp: 24, desc: "Partly Cloudy" },
        { time: "16:00", icon: "03d", temp: 23, desc: "Cloudy" },
        { time: "17:00", icon: "03d", temp: 21, desc: "Cloudy" },
        { time: "18:00", icon: "02d", temp: 20, desc: "Partly Cloudy" },
        { time: "19:00", icon: "01n", temp: 18, desc: "Clear" },
        { time: "20:00", icon: "01n", temp: 17, desc: "Clear" },
        { time: "21:00", icon: "01n", temp: 16, desc: "Clear" }
    ],
    daily: [
        { day: "Today", date: "Jul 20", icon: "02d", high: 25, low: 16, precip: 10 },
        { day: "Tomorrow", date: "Jul 21", icon: "01d", high: 28, low: 18, precip: 0 },
        { day: "Monday", date: "Jul 22", icon: "10d", high: 24, low: 15, precip: 60 },
        { day: "Tuesday", date: "Jul 23", icon: "03d", high: 22, low: 14, precip: 20 },
        { day: "Wednesday", date: "Jul 24", icon: "01d", high: 26, low: 17, precip: 5 },
        { day: "Thursday", date: "Jul 25", icon: "02d", high: 25, low: 16, precip: 15 },
        { day: "Friday", date: "Jul 26", icon: "09d", high: 21, low: 13, precip: 80 }
    ]
};

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new WeatherApp();
    
    // Load sample data if no API key is provided
    if (app.apiKey === 'YOUR_API_KEY_HERE') {
        console.warn('API key not provided. Loading sample data...');
        app.loadSampleData();
    }
});

// Add sample data loading method to WeatherApp class
WeatherApp.prototype.loadSampleData = function() {
    // Update current weather with sample data
    document.getElementById('currentTemp').textContent = `${sampleWeatherData.current.temperature}°`;
    document.getElementById('feelsLike').textContent = `Feels like ${sampleWeatherData.current.feelsLike}°`;
    document.getElementById('weatherDesc').textContent = sampleWeatherData.current.description;
    document.getElementById('weatherIcon').className = this.getWeatherIcon(sampleWeatherData.current.icon);
    
    // Update details
    document.getElementById('visibility').textContent = `${sampleWeatherData.current.visibility} km`;
    document.getElementById('humidity').textContent = `${sampleWeatherData.current.humidity}%`;
    document.getElementById('windSpeed').textContent = `${sampleWeatherData.current.windSpeed} km/h`;
    document.getElementById('pressure').textContent = `${sampleWeatherData.current.pressure} hPa`;
    document.getElementById('uvIndex').textContent = sampleWeatherData.current.uvIndex;
    document.getElementById('precipitation').textContent = `${sampleWeatherData.current.precipitation}mm`;
    
    // Update sun/moon times
    document.getElementById('sunrise').textContent = sampleWeatherData.current.sunrise;
    document.getElementById('sunset').textContent = sampleWeatherData.current.sunset;
    
    // Load hourly forecast
    const hourlyContainer = document.getElementById('hourlyForecast');
    hourlyContainer.innerHTML = '';
    
    sampleWeatherData.hourly.forEach(item => {
        const hourlyItem = document.createElement('div');
        hourlyItem.className = 'hourly-item';
        hourlyItem.innerHTML = `
            <div class="hourly-time">${item.time}</div>
            <div class="hourly-icon">
                <i class="${this.getWeatherIcon(item.icon)}"></i>
            </div>
            <div class="hourly-temp">${item.temp}°</div>
            <div class="hourly-desc">${item.desc}</div>
        `;
        hourlyContainer.appendChild(hourlyItem);
    });
    
    // Load daily forecast
    const dailyContainer = document.getElementById('dailyForecast');
    dailyContainer.innerHTML = '';
    
    sampleWeatherData.daily.forEach(item => {
        const dailyItem = document.createElement('div');
        dailyItem.className = 'daily-item';
        dailyItem.innerHTML = `
            <div class="daily-date">
                <div class="daily-day">${item.day}</div>
                <div class="daily-date-num">${item.date}</div>
            </div>
            <div class="daily-weather">
                <div class="daily-icon">
                    <i class="${this.getWeatherIcon(item.icon)}"></i>
                </div>
                <div class="daily-desc">${item.desc || 'Partly Cloudy'}</div>
            </div>
            <div class="daily-temps">
                <span class="daily-high">${item.high}°</span>
                <span class="daily-low">${item.low}°</span>
            </div>
            <div class="daily-precip">
                <i class="fas fa-droplet"></i>
                <span>${item.precip}%</span>
            </div>
        `;
        dailyContainer.appendChild(dailyItem);
    });
};
