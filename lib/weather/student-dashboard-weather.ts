type StudentDashboardWeather = {
  locationLabel: string;
  periodLabel: string;
  temperatureLabel: string;
};

type BmkgForecastItem = {
  local_datetime?: string;
  t?: number | string;
  weather_desc?: string;
};

type BmkgWeatherResponse = {
  data?: Array<{
    cuaca?: BmkgForecastItem[][];
  }>;
  lokasi?: {
    desa?: string;
    kecamatan?: string;
    kotkab?: string;
    provinsi?: string;
  };
};

const DEFAULT_ADM4 = process.env.STUDENT_WEATHER_ADM4 ?? "31.71.03.1001";
const FALLBACK_LOCATION = "Wilayah sekolah";

export async function getStudentDashboardWeather(): Promise<StudentDashboardWeather> {
  try {
    const response = await fetch(
      `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${DEFAULT_ADM4}`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`BMKG API responded with ${response.status}`);
    }

    const data = (await response.json()) as BmkgWeatherResponse;
    const selectedForecast = pickClosestForecast(data);

    return {
      locationLabel: formatLocationLabel(data.lokasi),
      periodLabel: selectedForecast?.local_datetime
        ? formatPeriodLabel(selectedForecast.local_datetime)
        : formatPeriodLabel(),
      temperatureLabel:
        selectedForecast?.t !== undefined && selectedForecast?.t !== null
          ? `${Math.round(Number(selectedForecast.t))}° · ${selectedForecast.weather_desc ?? "Cuaca"}`
          : "Cuaca belum tersedia",
    };
  } catch {
    return {
      locationLabel: FALLBACK_LOCATION,
      periodLabel: formatPeriodLabel(),
      temperatureLabel: "Cuaca belum tersedia",
    };
  }
}

function pickClosestForecast(data: BmkgWeatherResponse) {
  const forecastItems =
    data.data?.[0]?.cuaca?.flatMap((dailyForecast) => dailyForecast ?? []) ?? [];

  if (forecastItems.length === 0) {
    return null;
  }

  const now = Date.now();

  return forecastItems.reduce<BmkgForecastItem | null>((closest, current) => {
    if (!current.local_datetime) {
      return closest;
    }

    const currentTime = new Date(current.local_datetime).getTime();

    if (Number.isNaN(currentTime)) {
      return closest;
    }

    if (!closest?.local_datetime) {
      return current;
    }

    const closestTime = new Date(closest.local_datetime).getTime();

    if (Number.isNaN(closestTime)) {
      return current;
    }

    return Math.abs(currentTime - now) < Math.abs(closestTime - now)
      ? current
      : closest;
  }, null);
}

function formatLocationLabel(location: BmkgWeatherResponse["lokasi"]) {
  const segments = [location?.desa, location?.kotkab].filter(Boolean);

  if (segments.length > 0) {
    return segments.join(", ");
  }

  return FALLBACK_LOCATION;
}

function formatPeriodLabel(localDateTime?: string) {
  const date = localDateTime ? new Date(localDateTime) : new Date();

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}
