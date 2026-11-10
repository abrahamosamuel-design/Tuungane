import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

import { COUNTRY_CODES } from '@/lib/countries';

export function PhoneInput({ value, onChange, required }: PhoneInputProps) {
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0]);
  const [localNumber, setLocalNumber] = useState('');

  useEffect(() => {
    if (value) {
      // Find the longest matching code first (e.g. +211 vs +2)
      const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
      const matchedCode = sortedCodes.find(c => value.startsWith(c.code));
      if (matchedCode) {
        setCountryCode(matchedCode);
        setLocalNumber(value.slice(matchedCode.code.length));
      } else {
        setLocalNumber(value);
      }
    }
  }, [value]);

  const handleCodeChange = (newCodeStr: string) => {
    // newCodeStr is 'Uganda_+256' to ensure uniqueness if codes are shared (e.g., +1)
    const [name, code] = newCodeStr.split('_');
    const matched = COUNTRY_CODES.find(c => c.name === name && c.code === code) || COUNTRY_CODES[0];
    setCountryCode(matched);
    updateValue(matched.code, localNumber);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value.replace(/\D/g, ''); // Only allow digits
    const maxLength = countryCode ? countryCode.length : 15;
    
    const trimmedNumber = newNumber.slice(0, maxLength);
    setLocalNumber(trimmedNumber);
    updateValue(countryCode.code, trimmedNumber);
  };

  const updateValue = (code: string, num: string) => {
    if (num) {
      onChange(`${code}${num}`);
    } else {
      onChange('');
    }
  };

  return (
    <div className="flex gap-2">
      <Select value={`${countryCode.name}_${countryCode.code}`} onValueChange={handleCodeChange}>
        <SelectTrigger className="w-[110px] shrink-0 font-medium px-3 bg-muted/50 rounded-xl">
          <SelectValue>
            <div className="flex items-center gap-1.5">
              <span>{countryCode.flag}</span>
              <span>{countryCode.code}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {COUNTRY_CODES.map((c) => (
            <SelectItem key={`${c.name}_${c.code}`} value={`${c.name}_${c.code}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none">{c.flag}</span>
                <span className="font-medium">{c.code}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        value={localNumber}
        onChange={handleNumberChange}
        placeholder={`e.g. ${'7'.padEnd(countryCode.length, '0')}`}
        required={required}
        className="flex-1 rounded-xl bg-background"
        pattern="\d*"
      />
    </div>
  );
}
