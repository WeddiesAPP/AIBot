import { ColorScheme, StartScreenPrompt, ThemeOption } from "@openai/chatkit";

export const WORKFLOW_ID =
  process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID?.trim() ?? "";

export const CREATE_SESSION_ENDPOINT = "/api/create-session";

export const STARTER_PROMPTS: StartScreenPrompt[] = [
  {
    label: "Wat kan je voor me doen?",
    prompt: "Wat kun je voor me doen?",
    icon: "circle-question",
  },
];

export const PLACEHOLDER_INPUT = "Typ je vraag over Finance RBBLS…";

export const GREETING = "Waar kan ik je vandaag mee helpen?";

export const getThemeConfig = (theme: ColorScheme): ThemeOption => ({
  color: {
    grayscale: {
      hue: 220,
      tint: 6,
      shade: theme === "light" ? -1 : -4,
    },
    accent: {
      primary: theme === "light" ? "#f1f5f9" : "#244BDA",
      level: theme === "light" ? 1 : 0,
    },
    surface: {
      background: theme === "light" ? "#0f172a" : "#ffffff",
      foreground: theme === "light" ? "#f8fafc" : "#1F2937",
    },
  },
  radius: "round",
  // Add other theme options here
  // chatkit.studio/playground to explore config options
});
