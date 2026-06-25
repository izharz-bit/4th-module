(function () {
  "use strict";

  const THEME_KEY = "weathernow.theme.v1";

  const elements = {
    root: document.documentElement,
    year: document.querySelector("[data-current-year]"),
    themeToggle: document.querySelector("[data-theme-toggle]"),
    form: document.querySelector("[data-weather-form]"),
    input: document.querySelector("[data-city-input]"),
    searchButton: document.querySelector("[data-search-button]"),
    error: document.querySelector("[data-error-message]"),
    loading: document.querySelector("[data-loading]"),
    emptyState: document.querySelector("[data-empty-state]"),
    weatherContent: document.querySelector("[data-weather-content]"),
    conditionPill: document.querySelector("[data-condition-pill]"),
    locationTitle: document.querySelector("[data-location-title]"),
    locationSubtitle: document.querySelector("[data-location-subtitle]"),
    weatherIcon: document.querySelector("[data-weather-icon]"),
    weatherCondition: document.querySelector("[data-weather-condition]"),
    temperature: document.querySelector("[data-temperature]"),
    humidity: document.querySelector("[data-humidity]"),
    windSpeed: document.querySelector("[data-wind-speed]"),
    windDirection: document.querySelector("[data-wind-direction]"),
    precipitation: document.querySelector("[data-precipitation]"),
    hourlyList: document.querySelector("[data-hourly-list]"),
    latitude: document.querySelector("[data-latitude]"),
    longitude: document.querySelector("[data-longitude]"),
    timezone: document.querySelector("[data-timezone]"),
    lastUpdated: document.querySelector("[data-last-updated]")
  };

  init();

  function init() {
    setCurrentYear();
    initTheme();

    elements.form.addEventListener("submit", handleSearch);

    loadDefaultCity();
  }

  function setCurrentYear() {
    if (elements.year) {
      elements.year.textContent = String(new Date().getFullYear());
    }
  }

  function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (systemPrefersDark ? "dark" : "light");

    setTheme(initialTheme);

    elements.themeToggle.addEventListener("click", () => {
      const currentTheme = elements.root.getAttribute("data-theme") || "light";
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      setTheme(nextTheme);
      localStorage.setItem(THEME_KEY, nextTheme);
    });
  }

  function setTheme(theme) {
    const isDark = theme === "dark";

    elements.root.setAttribute("data-theme", theme);
    elements.themeToggle.textContent = isDark ? "☀️" : "🌙";
    elements.themeToggle.setAttribute("aria-pressed", String(isDark));
    elements.themeToggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
  }

  async function loadDefaultCity() {
    try {
      await loadWeatherForCity("Mumbai");
      elements.input.value = "";
    } catch (error) {
      console.error(error);
      showEmptyState();
    }
  }

  async function handleSearch(event) {
    event.preventDefault();

    const city = normalizeCity(elements.input.value);

    if (!city) {
      showError("Please enter a city name.");
      return;
    }

    await loadWeatherForCity(city);
  }

  async function loadWeatherForCity(city) {
    setLoading(true);
    clearError();

    try {
      const location = await fetchLocation(city);
      const weather = await fetchWeather(location.latitude, location.longitude);
      const dashboardData = parseWeatherData(location, weather);

      renderWeather(dashboardData);
    } catch (error) {
      console.error(error);
      showError(error.message || "Something went wrong while fetching weather data.");
      showEmptyState();
    } finally {
      setLoading(false);
    }
  }

  async function fetchLocation(city) {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.search = new URLSearchParams({
      name: city,
      count: "1",
      language: "en",
      format: "json"
    }).toString();

    const response = await fetchJson(url);

    if (!response.results || response.results.length === 0) {
      throw new Error(`No location found for "${city}". Try a more specific city name.`);
    }

    const [location] = response.results;

    return {
      name: location.name,
      country: location.country,
      admin1: location.admin1 || "",
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone
    };
  }

  async function fetchWeather(latitude, longitude) {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m",
      hourly: "temperature_2m,relative_humidity_2m,precipitation_probability",
      forecast_days: "1",
      timezone: "auto"
    }).toString();

    return fetchJson(url);
  }

  async function fetchJson(url) {
    let response;

    try {
      response = await fetch(url);
    } catch (networkError) {
      throw new Error("Network request failed. Check your internet connection and try again.");
    }

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}. Please try again later.`);
    }

    try {
      return await response.json();
    } catch (parseError) {
      throw new Error("Failed to parse server response as JSON.");
    }
  }

  function parseWeatherData(location, weather) {
    if (!weather.current) {
      throw new Error("Weather response did not include current weather data.");
    }

    const current = weather.current;
    const hourly = weather.hourly || {};

    return {
      locationName: buildLocationName(location),
      latitude: weather.latitude,
      longitude: weather.longitude,
      timezone: weather.timezone,
      lastUpdated: current.time,
      current: {
        temperature: current.temperature_2m,
        humidity: current.relative_humidity_2m,
        precipitation: current.precipitation,
        weatherCode: current.weather_code,
        windSpeed: current.wind_speed_10m,
        windDirection: current.wind_direction_10m
      },
      hourly: buildHourlyForecast(hourly)
    };
  }

  function buildHourlyForecast(hourly) {
    if (!hourly.time || !hourly.temperature_2m) return [];

    const now = new Date();
    const forecast = hourly.time.map((time, index) => ({
      time,
      temperature: hourly.temperature_2m[index],
      humidity: hourly.relative_humidity_2m ? hourly.relative_humidity_2m[index] : null,
      precipitationProbability: hourly.precipitation_probability ? hourly.precipitation_probability[index] : null
    }));

    const upcoming = forecast.filter((item) => new Date(item.time) >= now);

    return upcoming.slice(0, 8);
  }

  function renderWeather(data) {
    const weatherInfo = getWeatherDescription(data.current.weatherCode);

    elements.emptyState.hidden = true;
    elements.weatherContent.hidden = false;
    elements.conditionPill.hidden = false;

    elements.locationTitle.textContent = data.locationName;
    elements.locationSubtitle.textContent = `Live weather as of ${formatDateTime(data.lastUpdated)}.`;
    elements.weatherIcon.textContent = weatherInfo.icon;
    elements.weatherCondition.textContent = weatherInfo.label;

    elements.temperature.textContent = formatNumber(data.current.temperature);
    elements.humidity.textContent = formatNumber(data.current.humidity);
    elements.windSpeed.textContent = formatNumber(data.current.windSpeed);
    elements.windDirection.textContent = formatNumber(data.current.windDirection);
    elements.precipitation.textContent = formatNumber(data.current.precipitation);

    elements.latitude.textContent = formatNumber(data.latitude, 4);
    elements.longitude.textContent = formatNumber(data.longitude, 4);
    elements.timezone.textContent = data.timezone || "--";
    elements.lastUpdated.textContent = formatDateTime(data.lastUpdated);

    renderHourlyForecast(data.hourly);
  }

  function renderHourlyForecast(hourlyData) {
    elements.hourlyList.replaceChildren();

    if (hourlyData.length === 0) {
      const message = document.createElement("p");
      message.className = "muted";
      message.textContent = "No hourly forecast available.";
      elements.hourlyList.appendChild(message);
      return;
    }

    const fragment = document.createDocumentFragment();

    hourlyData.forEach((hour) => {
      const card = document.createElement("article");
      card.className = "hour-card";

      const time = document.createElement("time");
      time.dateTime = hour.time;
      time.textContent = formatHour(hour.time);

      const temperature = document.createElement("p");
      temperature.textContent = `${formatNumber(hour.temperature)}°C`;

      const humidity = document.createElement("span");
      humidity.className = "muted";
      humidity.textContent = hour.humidity === null ? "Humidity: --" : `Humidity: ${formatNumber(hour.humidity)}%`;

      card.append(time, temperature, humidity);
      fragment.appendChild(card);
    });

    elements.hourlyList.appendChild(fragment);
  }

  function showEmptyState() {
    elements.emptyState.hidden = false;
    elements.weatherContent.hidden = true;
    elements.conditionPill.hidden = true;

    elements.locationTitle.textContent = "Search for a city";
    elements.locationSubtitle.textContent = "Weather metrics will appear here.";

    elements.latitude.textContent = "--";
    elements.longitude.textContent = "--";
    elements.timezone.textContent = "--";
    elements.lastUpdated.textContent = "--";
  }

  function setLoading(isLoading) {
    elements.loading.hidden = !isLoading;
    elements.searchButton.disabled = isLoading;
    elements.searchButton.textContent = isLoading ? "Searching..." : "Search";

    if (isLoading) {
      elements.emptyState.hidden = true;
      elements.weatherContent.hidden = true;
      elements.conditionPill.hidden = true;
    }
  }

  function showError(message) {
    elements.input.setAttribute("aria-invalid", "true");
    elements.error.textContent = message;
  }

  function clearError() {
    elements.input.removeAttribute("aria-invalid");
    elements.error.textContent = "";
  }

  function normalizeCity(value) {
    return value.trim().replace(/\s+/g, " ");
  }

  function buildLocationName(location) {
    const parts = [location.name, location.admin1, location.country].filter(Boolean);
    return parts.join(", ");
  }

  function formatNumber(value, digits = 0) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "--";
    }

    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: digits
    }).format(Number(value));
  }

  function formatDateTime(value) {
    if (!value) return "--";

    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  }

  function formatHour(value) {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(value));
  }

  function getWeatherDescription(code) {
    const weatherCodes = {
      0: ["Clear sky", "☀️"],
      1: ["Mainly clear", "🌤️"],
      2: ["Partly cloudy", "⛅"],
      3: ["Overcast", "☁️"],
      45: ["Fog", "🌫️"],
      48: ["Depositing rime fog", "🌫️"],
      51: ["Light drizzle", "🌦️"],
      53: ["Moderate drizzle", "🌦️"],
      55: ["Dense drizzle", "🌧️"],
      56: ["Light freezing drizzle", "🌧️"],
      57: ["Dense freezing drizzle", "🌧️"],
      61: ["Slight rain", "🌧️"],
      63: ["Moderate rain", "🌧️"],
      65: ["Heavy rain", "🌧️"],
      66: ["Light freezing rain", "🌧️"],
      67: ["Heavy freezing rain", "🌧️"],
      71: ["Slight snow", "🌨️"],
      73: ["Moderate snow", "🌨️"],
      75: ["Heavy snow", "❄️"],
      77: ["Snow grains", "❄️"],
      80: ["Slight rain showers", "🌦️"],
      81: ["Moderate rain showers", "🌧️"],
      82: ["Violent rain showers", "⛈️"],
      85: ["Slight snow showers", "🌨️"],
      86: ["Heavy snow showers", "🌨️"],
      95: ["Thunderstorm", "⛈️"],
      96: ["Thunderstorm with slight hail", "⛈️"],
      99: ["Thunderstorm with heavy hail", "⛈️"]
    };

    const [label, icon] = weatherCodes[code] || ["Unknown weather", "🌡️"];

    return { label, icon };
  }
})();
