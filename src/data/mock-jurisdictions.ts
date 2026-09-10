// ==========================================
// BhoomiAI - Jurisdiction Hierarchy
// ==========================================

export interface JurisdictionNode {
  name: string;
  children?: JurisdictionNode[];
}

export const JURISDICTION_HIERARCHY: JurisdictionNode[] = [
  {
    name: 'Uttar Pradesh',
    children: [
      {
        name: 'Amethi',
        children: [
          {
            name: 'Gauriganj',
            children: [
              { name: 'Rampur' },
              { name: 'Semrauta' },
              { name: 'Dharmapur' },
              { name: 'Bahadurpur' },
              { name: 'Sujanpur' },
            ],
          },
          {
            name: 'Musafirkhana',
            children: [
              { name: 'Shivgarh' },
              { name: 'Tiloi' },
              { name: 'Bhadarsa' },
            ],
          },
          {
            name: 'Jagdishpur',
            children: [
              { name: 'Mohanganj' },
              { name: 'Kasimpur' },
            ],
          },
        ],
      },
      {
        name: 'Lucknow',
        children: [
          {
            name: 'Sadar',
            children: [
              { name: 'Aliganj' },
              { name: 'Chinhat' },
              { name: 'Kakori' },
            ],
          },
          {
            name: 'Mohanlalganj',
            children: [
              { name: 'Malihabad' },
              { name: 'Bakshi Ka Talab' },
            ],
          },
        ],
      },
      {
        name: 'Varanasi',
        children: [
          {
            name: 'Varanasi Sadar',
            children: [
              { name: 'Sarnath' },
              { name: 'Ramnagar' },
              { name: 'Cholapur' },
            ],
          },
        ],
      },
      {
        name: 'Prayagraj',
        children: [
          {
            name: 'Prayagraj Sadar',
            children: [
              { name: 'Jhunsi' },
              { name: 'Phulpur' },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Madhya Pradesh',
    children: [
      {
        name: 'Bhopal',
        children: [
          {
            name: 'Huzur',
            children: [
              { name: 'Bairagarh' },
              { name: 'Misrod' },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Rajasthan',
    children: [
      {
        name: 'Jaipur',
        children: [
          {
            name: 'Jaipur City',
            children: [
              { name: 'Sanganer' },
              { name: 'Amer' },
            ],
          },
        ],
      },
    ],
  },
];

export function getStates(): string[] {
  return JURISDICTION_HIERARCHY.map(s => s.name);
}

export function getDistricts(state: string): string[] {
  const stateNode = JURISDICTION_HIERARCHY.find(s => s.name === state);
  return stateNode?.children?.map(d => d.name) || [];
}

export function getTehsils(state: string, district: string): string[] {
  const stateNode = JURISDICTION_HIERARCHY.find(s => s.name === state);
  const districtNode = stateNode?.children?.find(d => d.name === district);
  return districtNode?.children?.map(t => t.name) || [];
}

export function getVillages(state: string, district: string, tehsil: string): string[] {
  const stateNode = JURISDICTION_HIERARCHY.find(s => s.name === state);
  const districtNode = stateNode?.children?.find(d => d.name === district);
  const tehsilNode = districtNode?.children?.find(t => t.name === tehsil);
  return tehsilNode?.children?.map(v => v.name) || [];
}
