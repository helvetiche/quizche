import type { Dispatch, SetStateAction } from "react";

export type QuizSettingsState = {
  isActive: boolean;
  duration: number;
  deadline: string;
  maxAttempts: number;
  allowRetake: boolean;
  showResults: boolean;
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  preventCopyPaste: boolean;
  fullscreenMode: boolean;
  disableRightClick: boolean;
  antiCheatEnabled: boolean;
  tabChangeLimit: number;
  autoSubmitOnDisqualification: boolean;
};

export type QuizSettingsSetter = Dispatch<SetStateAction<QuizSettingsState>>;
