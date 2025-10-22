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
      hue: 223,
      tint: theme === "light" ? 5 : 6,
      
    },
    accent: {
      primary: theme === "light" ? "#244BDA" : "#93C5FD",
      level: theme === "light" ? 0 : 2,
    },
    surface: {
      background: theme === "light" ? "#FFFFFF" : "#0F172A",
      foreground: theme === "light" ? "#1F2937" : "#E2E8F0",
    },
  },
  radius: "round",
  // Add other theme options here
  // chatkit.studio/playground to explore config options
});
