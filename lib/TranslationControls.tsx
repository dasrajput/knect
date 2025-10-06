'use client';

import React from 'react';

export interface TranslationSettings {
  inputLang: string;
  outputLang: string;
  gender: string;
}

interface TranslationControlsProps {
  settings: TranslationSettings;
  onChange: (settings: TranslationSettings) => void;
}

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

export function TranslationControls({ settings, onChange }: TranslationControlsProps) {
  console.debug('[TranslationControls] Rendering with settings:', settings);

  const handleInputLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.debug('[TranslationControls] Input language changed to:', e.target.value);
    onChange({ ...settings, inputLang: e.target.value });
  };

  const handleOutputLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.debug('[TranslationControls] Output language changed to:', e.target.value);
    onChange({ ...settings, outputLang: e.target.value });
  };

  const handleGenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.debug('[TranslationControls] Gender changed to:', e.target.value);
    onChange({ ...settings, gender: e.target.value });
  };

  return (
    <div className="translation-controls">
      <div className="control-group">
        <label htmlFor="inputLang">Input Language:</label>
        <select
          id="inputLang"
          value={settings.inputLang}
          onChange={handleInputLangChange}
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="control-group">
        <label htmlFor="outputLang">Output Language:</label>
        <select
          id="outputLang"
          value={settings.outputLang}
          onChange={handleOutputLangChange}
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="control-group">
        <label htmlFor="gender">Voice Gender:</label>
        <select
          id="gender"
          value={settings.gender}
          onChange={handleGenderChange}
        >
          {GENDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}