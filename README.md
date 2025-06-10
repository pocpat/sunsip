# SunSip 🌅🍹

A beautiful web application that suggests cocktails based on your city's weather and local culture. Discover the perfect drink that matches your location's vibe and current weather conditions.

## ✨ Features

- **Weather-Based Recommendations**: Get cocktail suggestions that match your city's current weather
- **Cultural Integration**: Cocktails influenced by local drinking preferences and traditions
- **Beautiful UI**: Immersive room visualization with dynamic weather effects
- **User Accounts**: Save your favorite city-cocktail combinations
- **Real-time Weather**: Live weather data integration
- **Responsive Design**: Works perfectly on all devices

## 🚀 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Weather API**: WeatherAPI
- **Geocoding**: Geoapify
- **Error Tracking**: Sentry
- **Deployment**: Netlify
- **Build Tool**: Vite

## 🛠️ Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/sunsip.git
   cd sunsip
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_WEATHER_API_KEY=your_weather_api_key
   VITE_GEOCODING_API_KEY=your_geocoding_api_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 🗄️ Database Setup

The project uses Supabase for authentication and data storage. Run the migrations:

```bash
# Apply database migrations
supabase db push
```

## 🚀 Deployment

The project is configured for automatic deployment to Netlify via GitHub Actions.

### Manual Deployment
```bash
npm run build
# Upload dist/ folder to your hosting provider
```

## 🧪 Testing Sentry Integration

In development mode, you'll see a debug panel in the bottom-right corner with test buttons for:
- Error tracking
- Exception capturing
- Message logging

## 📱 Usage

1. **Search for a City**: Enter any city name to get suggestions
2. **View Results**: See the weather details and cocktail recommendation
3. **Save Combinations**: Sign up to save your favorite city-cocktail pairs
4. **Explore**: Try different cities and weather conditions

## 🎨 Design Philosophy

SunSip combines weather data with cultural drinking preferences to create personalized cocktail recommendations. The immersive room visualization creates a cozy atmosphere that changes based on the weather conditions of your selected city.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Weather data provided by [WeatherAPI](https://weatherapi.com/)
- Geocoding services by [Geoapify](https://geoapify.com/)
- Images from [Pexels](https://pexels.com/)
- Icons by [Lucide React](https://lucide.dev/)

---

Made with ❤️ and ☕ by [Your Name]