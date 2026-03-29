export interface Country {
  code: string;
  name: string;
  phonePrefix: string;
}

export const LATIN_AMERICAN_COUNTRIES: Country[] = [
  { code: 'AR', name: 'Argentina', phonePrefix: '+54' },
  { code: 'BO', name: 'Bolivia', phonePrefix: '+591' },
  { code: 'BR', name: 'Brasil', phonePrefix: '+55' },
  { code: 'CL', name: 'Chile', phonePrefix: '+56' },
  { code: 'CO', name: 'Colombia', phonePrefix: '+57' },
  { code: 'CR', name: 'Costa Rica', phonePrefix: '+506' },
  { code: 'CU', name: 'Cuba', phonePrefix: '+53' },
  { code: 'EC', name: 'Ecuador', phonePrefix: '+593' },
  { code: 'SV', name: 'El Salvador', phonePrefix: '+503' },
  { code: 'GT', name: 'Guatemala', phonePrefix: '+502' },
  { code: 'HN', name: 'Honduras', phonePrefix: '+504' },
  { code: 'MX', name: 'México', phonePrefix: '+52' },
  { code: 'NI', name: 'Nicaragua', phonePrefix: '+505' },
  { code: 'PA', name: 'Panamá', phonePrefix: '+507' },
  { code: 'PY', name: 'Paraguay', phonePrefix: '+595' },
  { code: 'PE', name: 'Perú', phonePrefix: '+51' },
  { code: 'DO', name: 'República Dominicana', phonePrefix: '+1-809' },
  { code: 'UY', name: 'Uruguay', phonePrefix: '+598' },
  { code: 'VE', name: 'Venezuela', phonePrefix: '+58' },
];

export const getCountryByCode = (code: string): Country | undefined => {
  return LATIN_AMERICAN_COUNTRIES.find(c => c.code === code);
};

export const getCountryByPrefix = (prefix: string): Country | undefined => {
  return LATIN_AMERICAN_COUNTRIES.find(c => c.phonePrefix === prefix);
};
