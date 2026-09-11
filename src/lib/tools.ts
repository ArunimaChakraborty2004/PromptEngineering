export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

export const WEATHER_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "get_weather",
    description:
      "Get the current weather, temperature and conditions for a city.",
    parameters: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "City name, e.g. Hyderabad, New York, London",
        },
        units: {
          type: "string",
          enum: ["metric", "imperial"],
          description: "Temperature units (metric = Celsius, imperial = Fahrenheit)",
        },
      },
      required: ["city"],
    },
  },
};

export const CALCULATOR_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "calculate",
    description:
      "Perform a safe mathematical calculation and return the result. Supports +, -, *, /, ^ (power), parentheses, sin, cos, tan, sqrt, log, ln, abs, floor, ceil, round, min, max.",
    parameters: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description:
            "The mathematical expression to evaluate as a string, e.g. 'log10(140000*30)' or 'sqrt(144) + 8'",
        },
      },
      required: ["expression"],
    },
  },
};

export const IMAGE_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "generate_image",
    description:
      "Generate an AI image from a text description. Use this whenever the user asks to create, draw, or generate an image/picture/illustration/logo/etc. Returns a public image URL the user can open (and that renders in chat).",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description:
            "Detailed English description of the image to generate, e.g. 'A futuristic city skyline at sunset, purple and blue neon lights, digital art'",
        },
        width: {
          type: "number",
          description: "Image width in pixels (default 512, max 1024)",
        },
        height: {
          type: "number",
          description: "Image height in pixels (default 512, max 1024)",
        },
      },
      required: ["prompt"],
    },
  },
};

export const ALL_TOOLS: ToolDefinition[] = [WEATHER_TOOL, CALCULATOR_TOOL, IMAGE_TOOL];

export type ToolResult = { ok: boolean; result: string };

export function safeEvalMath(expr: string): number {
  const cleaned = expr
    .replace(/\^/g, "**")
    .replace(/log10\s*\(/g, "Math.log10(")
    .replace(/\blog\s*\(/g, "Math.log10(")
    .replace(/ln\s*\(/g, "Math.log(")
    .replace(/sqrt\s*\(/g, "Math.sqrt(")
    .replace(/sin\s*\(/g, "Math.sin(")
    .replace(/cos\s*\(/g, "Math.cos(")
    .replace(/tan\s*\(/g, "Math.tan(")
    .replace(/abs\s*\(/g, "Math.abs(")
    .replace(/floor\s*\(/g, "Math.floor(")
    .replace(/ceil\s*\(/g, "Math.ceil(")
    .replace(/round\s*\(/g, "Math.round(")
    .replace(/\bmin\s*\(/g, "Math.min(")
    .replace(/\bmax\s*\(/g, "Math.max(");

  // After replacement, reject anything not whitelisted.
  if (!/^[\d\s\.\+\-\*\/\(\)\u0041-\u005A\u0061-\u007A%,\[\]]+$/.test(cleaned)) {
    // Allow Math.* identifiers and digits/operators. Letters only allowed via Math.xxx
    const safe = /^[\d\s\.\+\-\*\/\(\)\,%\[\]]+$/.test(
      cleaned.replace(/Math\.[a-zA-Z]+/g, "")
    );
    if (!safe) {
      throw new Error("Expression contains disallowed characters.");
    }
  }

  // Validate character set strictly.
  if (!/^[0-9\s\.\+\-\*\/\(\)\,%\[\]Math\.a-zA-Z\u00B2\u00B3\u221A]+$/.test(cleaned)) {
    throw new Error("Expression contains disallowed characters.");
  }

  const fn = new Function(`"use strict"; return (${cleaned});`);
  return fn();
}

export async function runTool(
  name: string,
  args: Record<string, string | number>
): Promise<ToolResult> {
  switch (name) {
    case "get_weather":
      return getWeather(args.city as string, (args.units as string) || "metric");
    case "calculate":
      return calculate(args.expression as string);
    case "generate_image":
      return generateImage(args.prompt as string, Number(args.width) || 512, Number(args.height) || 512);
    default:
      return { ok: false, result: `Unknown tool: ${name}` };
  }
}

const weatherCache = new Map<string, { data: string; fetchedAt: number }>();

async function getWeather(city: string, units: string): Promise<ToolResult> {
  if (!city || typeof city !== "string" || city.trim().length === 0) {
    return { ok: false, result: "No city provided." };
  }
  const cityKey = `${city.trim().toLowerCase()}|${units}`;
  const cached = weatherCache.get(cityKey);
  if (cached && Date.now() - cached.fetchedAt < 10 * 60 * 1000) {
    return { ok: true, result: cached.data };
  }

  const unitSymbol = units === "imperial" ? "F" : "C";
  const apiKey = process.env.OPENWEATHER_API_KEY;

  try {
    if (apiKey) {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city
      )}&units=${units}&appid=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`OpenWeather status ${res.status}`);
      const json = (await res.json()) as {
        weather: { description: string; main: string }[];
        main: { temp: number; feels_like: number; humidity: number; pressure: number };
        wind: { speed: number };
        name: string;
      };
      const desc = json.weather?.[0]?.description ?? "unknown";
      const result = `Weather in ${json.name}: ${desc}, ${json.main.temp}\u00B0${unitSymbol} (feels like ${json.main.feels_like}\u00B0${unitSymbol}), humidity ${json.main.humidity}%, wind ${json.wind.speed} m/s, pressure ${json.main.pressure} hPa.`;
      weatherCache.set(cityKey, { data: result, fetchedAt: Date.now() });
      return { ok: true, result };
    }

    // Fallback: wttr.in - no API key required.
    const fmt = units === "imperial" ? "u" : "m";
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1&${fmt}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`wttr.in status ${res.status}`);
    const json = (await res.json()) as {
      current_condition: {
        temp_C: string;
        temp_F: string;
        weatherDesc: { value: string }[];
        humidity: string;
        windspeedKmph: string;
      }[];
      nearest_area: { areaName: { value: string }[] }[];
    };
    const cc = json.current_condition?.[0];
    if (!cc) throw new Error("No weather data returned.");
    const temp = units === "imperial" ? cc.temp_F : cc.temp_C;
    const wind = units === "imperial"
      ? `${(parseFloat(cc.windspeedKmph) * 0.621371).toFixed(1)} mph`
      : `${cc.windspeedKmph} km/h`;
    const area = json.nearest_area?.[0]?.areaName?.[0]?.value ?? city;
    const result = `Weather in ${area}: ${cc.weatherDesc[0]?.value ?? "unknown"}, ${temp}\u00B0${unitSymbol}, humidity ${cc.humidity}%, wind ${wind}. (Data: wttr.in)`;
    weatherCache.set(cityKey, { data: result, fetchedAt: Date.now() });
    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      result: `Could not fetch weather for "${city}": ${(error as Error).message}`,
    };
  }
}

function calculate(expression: string): ToolResult {
  if (!expression || typeof expression !== "string") {
    return { ok: false, result: "No expression provided." };
  }
  try {
    const value = safeEvalMath(expression);
    const formatted = Number.isInteger(value)
      ? String(value)
      : String(Math.round(value * 1e8) / 1e8);
    return { ok: true, result: `${expression} = ${formatted}` };
  } catch (error) {
    return { ok: false, result: `Calculation failed: ${(error as Error).message}` };
  }
}

async function generateImage(
  prompt: string,
  width: number,
  height: number
): Promise<ToolResult> {
  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return { ok: false, result: "No image prompt provided." };
  }
  const w = Math.min(1024, Math.max(128, Math.round(width) || 512));
  const h = Math.min(1024, Math.max(128, Math.round(height) || 512));
  // Pollinations.ai is a free, keyless text-to-image API.
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&seed=${Math.floor(Math.random() * 10000)}`;
  return { ok: true, result: url };
}